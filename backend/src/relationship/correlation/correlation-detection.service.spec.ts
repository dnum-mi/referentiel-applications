import { ConfigService } from "@nestjs/config";
import { PrismaService } from "src/prisma/prisma.service";
import { CorrelationDetectionService } from "./correlation-detection.service";

interface MakeServiceOptions {
  candidates?: unknown[];
  config?: Record<string, unknown>;
  pendingUpdateCount?: number;
}

const makeService = ({
  candidates = [],
  config = {},
  pendingUpdateCount = 0,
}: MakeServiceOptions = {}) => {
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue(candidates),
    correlationSuggestion: {
      updateMany: jest.fn().mockResolvedValue({ count: pendingUpdateCount }),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const configService = {
    get: jest.fn(
      (key: string, fallback: unknown) =>
        (config as Record<string, unknown>)[key] ?? fallback,
    ),
  };
  const service = new CorrelationDetectionService(
    prisma as unknown as PrismaService,
    configService as unknown as ConfigService,
  );
  return { service, prisma };
};

const candidate = (overrides: Record<string, unknown> = {}) => ({
  applicationSourceId: "app-a",
  applicationTargetId: "app-b",
  nameSimilarity: 0,
  sharedDataCount: 0,
  sharedActorCount: 0,
  ...overrides,
});

describe("CorrelationDetectionService (#2284)", () => {
  describe("computeScore", () => {
    it("pondère les trois signaux avec les poids configurés", () => {
      const { service } = makeService();
      // 0.5 * 1 + 0.3 * (3/3) + 0.2 * (2/2) = 1
      expect(
        service.computeScore({
          nameSimilarity: 1,
          sharedDataCount: 3,
          sharedActorCount: 2,
        }),
      ).toBeCloseTo(1);
      // Nom seul : 0.5 * 0.8
      expect(
        service.computeScore({
          nameSimilarity: 0.8,
          sharedDataCount: 0,
          sharedActorCount: 0,
        }),
      ).toBeCloseTo(0.4);
    });

    it("sature les compteurs : plus de données/acteurs partagés n'augmente plus le score", () => {
      const { service } = makeService();
      const atSaturation = service.computeScore({
        nameSimilarity: 0,
        sharedDataCount: 3,
        sharedActorCount: 2,
      });
      const beyondSaturation = service.computeScore({
        nameSimilarity: 0,
        sharedDataCount: 30,
        sharedActorCount: 20,
      });
      expect(beyondSaturation).toBeCloseTo(atSaturation);
    });
  });

  describe("runDetectionSafely", () => {
    it("crée une suggestion PENDING pour une paire au-dessus du seuil, avec score et signaux", async () => {
      const { service, prisma } = makeService({
        candidates: [
          candidate({ nameSimilarity: 0.9, sharedDataCount: 2 }),
          // 0.5 * 0.2 = 0.1 : sous le seuil, ignorée
          candidate({
            applicationSourceId: "app-c",
            applicationTargetId: "app-d",
            nameSimilarity: 0.2,
          }),
        ],
      });

      const result = await service.runDetectionSafely();

      expect(result).toEqual({
        candidateCount: 2,
        createdCount: 1,
        updatedCount: 0,
      });
      expect(prisma.correlationSuggestion.createMany).toHaveBeenCalledTimes(1);
      const createArgs = prisma.correlationSuggestion.createMany.mock
        .calls[0][0] as {
        data: { score: number; signals: Record<string, number> }[];
        skipDuplicates: boolean;
      };
      // skipDuplicates : ne jamais écraser une paire déjà revue entre-temps
      expect(createArgs.skipDuplicates).toBe(true);
      expect(createArgs.data[0].score).toBeCloseTo(0.5 * 0.9 + 0.3 * (2 / 3));
      expect(createArgs.data[0].signals).toEqual({
        nameSimilarity: 0.9,
        sharedDataCount: 2,
        sharedActorCount: 0,
      });
    });

    it("rafraîchit une paire déjà PENDING (updateMany ciblé PENDING) sans la recréer", async () => {
      const { service, prisma } = makeService({
        candidates: [candidate({ nameSimilarity: 0.9, sharedDataCount: 3 })],
        pendingUpdateCount: 1,
      });

      const result = await service.runDetectionSafely();

      expect(result).toEqual({
        candidateCount: 1,
        createdCount: 0,
        updatedCount: 1,
      });
      const updateArgs = prisma.correlationSuggestion.updateMany.mock
        .calls[0][0] as { where: { status: string } };
      // Seules les PENDING sont rafraîchies : une revue n'est jamais écrasée
      expect(updateArgs.where.status).toBe("PENDING");
      expect(prisma.correlationSuggestion.createMany).not.toHaveBeenCalled();
    });

    it("exclut en SQL les paires déjà reliées, déjà revues, et l'auto-corrélation", async () => {
      const { service, prisma } = makeService();

      await service.runDetectionSafely();

      const sql = (prisma.$queryRaw.mock.calls[0][0] as unknown as string[])
        .join("")
        .replaceAll(/\s+/g, " ");
      // Paires en ordre canonique (jamais A↔A ni le doublon B→A)
      expect(sql).toContain("a.id < b.id");
      // Jamais re-proposer une paire déjà reliée par une Relation (tout type)
      expect(sql).toContain('NOT EXISTS ( SELECT 1 FROM "Relation"');
      // Jamais re-proposer une paire déjà ACCEPTED/REJECTED
      expect(sql).toContain("cs.status <> 'PENDING'");
      // Croisement trigramme fait en SQL sur les index existants
      expect(sql).toContain("a.label % b.label");
    });

    it("ne lance pas deux détections en parallèle", async () => {
      const { service, prisma } = makeService();
      let releaseQuery: (rows: unknown[]) => void = () => undefined;
      prisma.$queryRaw.mockImplementation(
        () =>
          new Promise((resolve) => {
            releaseQuery = resolve;
          }),
      );

      const first = service.runDetectionSafely();
      const second = await service.runDetectionSafely();

      expect(second).toBeNull();
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);

      releaseQuery([]);
      await expect(first).resolves.toEqual({
        candidateCount: 0,
        createdCount: 0,
        updatedCount: 0,
      });
    });
  });

  describe("handleScheduledDetection", () => {
    it("n'exécute rien quand CORRELATION_CRON_ENABLED est désactivé", async () => {
      const { service, prisma } = makeService({
        config: { "correlation.cronEnabled": false },
      });

      await service.handleScheduledDetection();

      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it("exécute la détection quand le cron est activé", async () => {
      const { service, prisma } = makeService({
        config: { "correlation.cronEnabled": true },
      });

      await service.handleScheduledDetection();

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });
});
