import { ConflictException, NotFoundException } from "@nestjs/common";
import { RelationService } from "../relation.service";
import { CorrelationSuggestionService } from "./correlation-suggestion.service";
import { CorrelationDetectionService } from "./correlation-detection.service";
import { ICorrelationSuggestionRepository } from "./infrastructure/repository/correlation-suggestion.repository.interface";

const suggestionRow = (overrides: Record<string, unknown> = {}) => ({
  id: "sug-1",
  applicationSourceId: "app-a",
  applicationTargetId: "app-b",
  sourceApplication: { id: "app-a", label: "Appli A" },
  targetApplication: { id: "app-b", label: "Appli B" },
  score: 0.75,
  signals: { nameSimilarity: 0.9, sharedDataCount: 2, sharedActorCount: 0 },
  status: "PENDING",
  createdAt: new Date("2026-08-20T00:00:00Z"),
  reviewedById: null,
  reviewedAt: null,
  ...overrides,
});

interface MakeServiceOptions {
  rows?: unknown[];
  total?: number;
  suggestion?: unknown;
  detectionResult?: unknown;
}

const makeService = ({
  rows = [],
  total,
  suggestion = null,
  detectionResult = { candidateCount: 0, createdCount: 0, updatedCount: 0 },
}: MakeServiceOptions = {}) => {
  const repository = {
    findAllPaginated: jest
      .fn()
      .mockResolvedValue({ results: rows, total: total ?? rows.length }),
    findOne: jest.fn().mockResolvedValue(suggestion),
    updateStatus: jest
      .fn()
      .mockImplementation((id: string, status: string, reviewedById: string) =>
        Promise.resolve(
          suggestionRow({ status, reviewedById, reviewedAt: new Date() }),
        ),
      ),
  };
  const relationService = {
    create: jest.fn().mockResolvedValue({ id: "rel-1" }),
  };
  const detectionService = {
    runDetectionSafely: jest.fn().mockResolvedValue(detectionResult),
  };
  const service = new CorrelationSuggestionService(
    repository as unknown as ICorrelationSuggestionRepository,
    relationService as unknown as RelationService,
    detectionService as unknown as CorrelationDetectionService,
  );
  return { service, repository, relationService, detectionService };
};

describe("CorrelationSuggestionService (#2285)", () => {
  describe("find", () => {
    it("renvoie la liste paginée avec le total et les signaux détaillés", async () => {
      const { service } = makeService({ rows: [suggestionRow()], total: 42 });

      const page = await service.find({ page: 0, pageSize: 15 });

      expect(page.total).toBe(42);
      expect(page.results).toHaveLength(1);
      expect(page.results[0]).toMatchObject({
        id: "sug-1",
        sourceApplication: { id: "app-a", label: "Appli A" },
        targetApplication: { id: "app-b", label: "Appli B" },
        score: 0.75,
        status: "PENDING",
        signals: {
          nameSimilarity: 0.9,
          sharedDataCount: 2,
          sharedActorCount: 0,
        },
      });
    });

    it("transmet le filtre de statut et les paramètres de pagination au repository", async () => {
      const { service, repository } = makeService();

      await service.find({
        status: "REJECTED",
        page: 2,
        pageSize: 10,
        sortBy: "createdAt",
        order: "asc",
      });

      expect(repository.findAllPaginated).toHaveBeenCalledWith({
        status: "REJECTED",
        page: 2,
        pageSize: 10,
        sortBy: "createdAt",
        order: "asc",
      });
    });
  });

  describe("accept", () => {
    it("crée exactement une relation is_correlated_with via RelationService (traçabilité Metadata) puis passe la suggestion en ACCEPTED", async () => {
      const { service, relationService, repository } = makeService({
        suggestion: suggestionRow(),
      });

      const result = await service.accept("sug-1", "user-1");

      // La relation part de la paire canonique de la suggestion
      expect(relationService.create).toHaveBeenCalledTimes(1);
      expect(relationService.create).toHaveBeenCalledWith(
        "app-a",
        {
          applicationTargetId: "app-b",
          type: "is_correlated_with",
          mediationServiceId: null,
        },
        "user-1",
      );
      expect(repository.updateStatus).toHaveBeenCalledWith(
        "sug-1",
        "ACCEPTED",
        "user-1",
      );
      expect(result.status).toBe("ACCEPTED");
      expect(result.reviewedById).toBe("user-1");
    });

    it("renvoie 404 pour une suggestion inconnue", async () => {
      const { service } = makeService({ suggestion: null });

      await expect(service.accept("nope", "user-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("renvoie 409 pour un second accept (suggestion déjà revue), sans créer de relation", async () => {
      const { service, relationService } = makeService({
        suggestion: suggestionRow({ status: "ACCEPTED" }),
      });

      await expect(service.accept("sug-1", "user-1")).rejects.toThrow(
        ConflictException,
      );
      expect(relationService.create).not.toHaveBeenCalled();
    });
  });

  describe("reject", () => {
    it("passe la suggestion en REJECTED sans créer de relation", async () => {
      const { service, relationService, repository } = makeService({
        suggestion: suggestionRow(),
      });

      const result = await service.reject("sug-1", "user-1");

      expect(relationService.create).not.toHaveBeenCalled();
      expect(repository.updateStatus).toHaveBeenCalledWith(
        "sug-1",
        "REJECTED",
        "user-1",
      );
      expect(result.status).toBe("REJECTED");
    });

    it("renvoie 404 pour une suggestion inconnue et 409 si déjà revue", async () => {
      const notFound = makeService({ suggestion: null });
      await expect(notFound.service.reject("nope", "user-1")).rejects.toThrow(
        NotFoundException,
      );

      const reviewed = makeService({
        suggestion: suggestionRow({ status: "REJECTED" }),
      });
      await expect(reviewed.service.reject("sug-1", "user-1")).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("runDetection", () => {
    it("renvoie le résumé de la détection", async () => {
      const { service } = makeService({
        detectionResult: {
          candidateCount: 5,
          createdCount: 2,
          updatedCount: 1,
        },
      });

      await expect(service.runDetection()).resolves.toEqual({
        candidateCount: 5,
        createdCount: 2,
        updatedCount: 1,
      });
    });

    it("renvoie 409 quand une détection est déjà en cours", async () => {
      const { service } = makeService({ detectionResult: null });

      await expect(service.runDetection()).rejects.toThrow(ConflictException);
    });
  });
});
