import { randomUUID } from "node:crypto";
import { PrismaService } from "src/prisma/prisma.service";
import { TokenExpirationReminderService } from "src/token/token-expiration-reminder.service";
import { PinoLogger } from "nestjs-pino";
import { LoggerService } from "src/logger/logger.service";

const NOW = new Date("2026-11-01T12:00:00Z");
const DAY = 86400000;

describe("Rappels d'expiration des jetons (#3093)", () => {
  const prisma = new PrismaService(
    { url: process.env.DATABASE_URL },
    new LoggerService(new PinoLogger({})),
  );
  const service = new TokenExpirationReminderService(prisma);
  let ownerId: string;
  let otherId: string;

  beforeAll(async () => {
    await prisma.$connect();
  });
  beforeEach(async () => {
    jest.useFakeTimers({
      now: NOW,
      doNotFake: [
        "nextTick",
        "setImmediate",
        "clearImmediate",
        "setInterval",
        "clearInterval",
        "setTimeout",
        "clearTimeout",
        "performance",
        "hrtime",
        "queueMicrotask",
      ],
    });
    const owner = await prisma.user.create({
      data: { email: `${randomUUID()}@example.test` },
    });
    const other = await prisma.user.create({
      data: { email: `${randomUUID()}@example.test`, type: "bot" },
    });
    ownerId = owner.id;
    otherId = other.id;
  });
  afterEach(async () => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    await prisma.token.deleteMany({
      where: { createdById: { in: [ownerId, otherId] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId] } } });
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  const createToken = (
    expiresAt = new Date(NOW.getTime() + DAY),
    serviceToken = false,
  ) =>
    prisma.token.create({
      data: {
        name: "Automatisation",
        description: "test",
        hash: randomUUID(),
        createdById: ownerId,
        userIdImpersonate: serviceToken ? otherId : ownerId,
        expiresAt,
      },
    });
  const notifications = () =>
    prisma.notification.findMany({ where: { userId: ownerId } });

  it("respecte les bornes, les statuts et notifie seulement le créateur humain", async () => {
    await createToken(new Date(NOW.getTime() + 7 * DAY), true);
    await createToken(new Date(NOW.getTime() + 1));
    await createToken(new Date(NOW.getTime() + 7 * DAY + 1));
    await createToken(NOW);
    await createToken(new Date(NOW.getTime() - 1));
    for (const status of ["revoked", "expired"] as const) {
      const token = await createToken();
      await prisma.token.update({ where: { id: token.id }, data: { status } });
    }
    const botToken = await createToken();
    await prisma.token.update({
      where: { id: botToken.id },
      data: { createdById: otherId },
    });
    await service.notifyExpiringTokens();
    const rows = await notifications();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      type: "token_expiration_reminder",
      link: "/profil?tab=tokens",
      emailLogId: null,
    });
    expect(rows.map((row) => row.message)).toContain(
      "Le jeton « Automatisation » expire le 8 novembre 2026 à 13:00.",
    );
    expect(
      await prisma.notification.count({ where: { userId: otherId } }),
    ).toBe(0);
    expect(JSON.stringify(rows)).not.toContain(botToken.hash);
  });

  it("retente un créateur débloqué avant expiration", async () => {
    await createToken();
    await prisma.user.update({
      where: { id: ownerId },
      data: { isBlocked: true },
    });
    await service.notifyExpiringTokens();
    expect(await notifications()).toHaveLength(0);
    await prisma.user.update({
      where: { id: ownerId },
      data: { isBlocked: false },
    });
    await service.notifyExpiringTokens();
    expect(await notifications()).toHaveLength(1);
  });

  it("déduplique les exécutions concurrentes et les redémarrages, même après suppression", async () => {
    await createToken();
    await Promise.all([
      service.notifyExpiringTokens(),
      new TokenExpirationReminderService(prisma).notifyExpiringTokens(),
    ]);
    expect(await notifications()).toHaveLength(1);
    await prisma.notification.deleteMany({ where: { userId: ownerId } });
    await new TokenExpirationReminderService(prisma).notifyExpiringTokens();
    expect(await notifications()).toHaveLength(0);
  });

  it("notifie une nouvelle échéance mais jamais deux fois une ancienne", async () => {
    const token = await createToken();
    await service.notifyExpiringTokens();
    await prisma.token.update({
      where: { id: token.id },
      data: {
        expiresAt: new Date(NOW.getTime() + 2 * DAY),
        hash: randomUUID(),
      },
    });
    await service.notifyExpiringTokens();
    expect(await notifications()).toHaveLength(2);
    await prisma.token.update({
      where: { id: token.id },
      data: { expiresAt: token.expiresAt },
    });
    await service.notifyExpiringTokens();
    expect(await notifications()).toHaveLength(2);
  });

  it("annule le journal si la notification échoue puis retente", async () => {
    const token = await createToken();
    const failingPrisma = prisma.$extends({
      query: {
        notification: {
          async create() {
            throw new Error("Échec simulé");
          },
        },
      },
    });
    // L'extension conserve le contrat Prisma utilisé par le service.
    await new TokenExpirationReminderService(
      failingPrisma as unknown as PrismaService,
    ).notifyExpiringTokens();
    expect(
      await prisma.tokenExpirationReminder.count({
        where: { tokenId: token.id },
      }),
    ).toBe(0);
    expect(await notifications()).toHaveLength(0);
    await service.notifyExpiringTokens();
    expect(await notifications()).toHaveLength(1);
  });

  it.each(["revocation", "regeneration", "blocage"])(
    "revérifie après une %s concurrente",
    async (action) => {
      const token = await createToken();
      // Intercaler une écriture validée entre la sélection des candidats et la prise des verrous.
      const racingPrisma = prisma.$extends({
        query: {
          token: {
            async findMany({ args, query }) {
              const result = await query(args);
              if (action === "blocage")
                await prisma.user.update({
                  where: { id: ownerId },
                  data: { isBlocked: true },
                });
              else
                await prisma.token.update({
                  where: { id: token.id },
                  data:
                    action === "revocation"
                      ? { status: "revoked" }
                      : { expiresAt: new Date(NOW.getTime() + 8 * DAY) },
                });
              return result;
            },
          },
        },
      });
      await new TokenExpirationReminderService(
        racingPrisma as unknown as PrismaService,
      ).notifyExpiringTokens();
      expect(await notifications()).toHaveLength(0);
      expect(
        await prisma.tokenExpirationReminder.count({
          where: { tokenId: token.id },
        }),
      ).toBe(0);
    },
  );
});
