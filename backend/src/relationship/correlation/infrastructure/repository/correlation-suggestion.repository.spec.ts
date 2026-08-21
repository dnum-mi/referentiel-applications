import { PrismaService } from "src/prisma/prisma.service";
import { CorrelationSuggestionRepository } from "./correlation-suggestion.repository";

describe("CorrelationSuggestionRepository (#2285)", () => {
  const makeRepository = () => {
    const findMany = jest.fn().mockReturnValue("findManyQuery");
    const count = jest.fn().mockReturnValue("countQuery");
    const prisma = {
      correlationSuggestion: { findMany, count },
      $transaction: jest.fn().mockResolvedValue([[], 0]),
    };
    const repository = new CorrelationSuggestionRepository(
      prisma as unknown as PrismaService,
    );
    return { repository, findMany, count };
  };

  it("trie par score décroissant par défaut et pagine", async () => {
    const { repository, findMany } = makeRepository();

    await repository.findAllPaginated({ page: 2, pageSize: 10 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { score: "desc" },
        skip: 20,
        take: 10,
      }),
    );
  });

  it("refuse un champ de tri hors liste blanche (retombe sur le score)", async () => {
    const { repository, findMany } = makeRepository();

    await repository.findAllPaginated({ sortBy: "signals", order: "asc" });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { score: "asc" } }),
    );
  });

  it("filtre par statut et applique le même where au count", async () => {
    const { repository, findMany, count } = makeRepository();

    await repository.findAllPaginated({ status: "PENDING" });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "PENDING" } }),
    );
    expect(count).toHaveBeenCalledWith({ where: { status: "PENDING" } });
  });

  it("désactive la pagination quand pageSize vaut 0 (convention PaginationDto)", async () => {
    const { repository, findMany } = makeRepository();

    await repository.findAllPaginated({ pageSize: 0 });

    const args = findMany.mock.calls[0][0] as Record<string, unknown>;
    expect(args.skip).toBeUndefined();
    expect(args.take).toBeUndefined();
  });
});
