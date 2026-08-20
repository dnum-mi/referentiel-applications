import { CorrelationSuggestionService } from "./correlation-suggestion.service";
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

describe("CorrelationSuggestionService (#2285, liste)", () => {
  const makeService = (rows: unknown[] = [], total = rows.length) => {
    const repository = {
      findAllPaginated: jest.fn().mockResolvedValue({ results: rows, total }),
      findOne: jest.fn(),
    };
    const service = new CorrelationSuggestionService(
      repository as unknown as ICorrelationSuggestionRepository,
    );
    return { service, repository };
  };

  it("renvoie la liste paginée avec le total et les signaux détaillés", async () => {
    const { service } = makeService([suggestionRow()], 42);

    const page = await service.find({ page: 0, pageSize: 15 });

    expect(page.total).toBe(42);
    expect(page.results).toHaveLength(1);
    expect(page.results[0]).toMatchObject({
      id: "sug-1",
      sourceApplication: { id: "app-a", label: "Appli A" },
      targetApplication: { id: "app-b", label: "Appli B" },
      score: 0.75,
      status: "PENDING",
      signals: { nameSimilarity: 0.9, sharedDataCount: 2, sharedActorCount: 0 },
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
