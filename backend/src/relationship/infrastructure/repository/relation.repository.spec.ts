import { RelationType, Status } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { RelationRepository } from "./relation.repository";

type Edge = readonly [string, string];
interface Application {
  id: string;
  label: string;
  currentStatus: { status: Status } | null;
}

function fixture(
  edges: readonly Edge[],
  statuses: Record<string, Status | null> = {},
  isolated: string[] = [],
) {
  const applications = new Map<string, Application>(
    [...new Set([...edges.flat(), ...isolated])].map((id) => {
      const status = Object.hasOwn(statuses, id)
        ? statuses[id]
        : Status.in_production;
      return [id, { id, label: id, currentStatus: status ? { status } : null }];
    }),
  );
  const relations = edges.map(([source, target]) => ({
    id: `${source}>${target}`,
    applicationSourceId: source,
    applicationTargetId: target,
    type: RelationType.is_part_of,
    sourceApplication: applications.get(source)!,
    targetApplication: applications.get(target)!,
    mediationService: null,
  }));
  const findUnique = jest.fn(async ({ where }: { where: { id: string } }) =>
    applications.get(where.id),
  );
  const findMany = jest.fn(
    async ({
      where,
    }: {
      where: {
        OR: {
          applicationSourceId?: string;
          applicationTargetId?: string;
        }[];
      };
    }) =>
      relations.filter((relation) =>
        where.OR.some(
          (condition) =>
            condition.applicationSourceId === relation.applicationSourceId ||
            condition.applicationTargetId === relation.applicationTargetId,
        ),
      ),
  );
  const prisma = {
    application: { findUnique },
    relation: { findMany },
  };
  return {
    repository: new RelationRepository(prisma as unknown as PrismaService),
    findUnique,
    findMany,
  };
}

function permutations<T>(values: readonly T[]): T[][] {
  if (values.length === 0) return [[]];
  return values.flatMap((value, index) =>
    permutations(values.filter((_, other) => index !== other)).map((rest) => [
      value,
      ...rest,
    ]),
  );
}

describe("RelationRepository.getRelationGraph", () => {
  const triangleAndChain: Edge[] = [
    ["A", "B"],
    ["B", "C"],
    ["A", "C"],
    ["C", "D"],
    ["D", "E"],
  ];

  it("reaches E at depth 3 for all 120 relation orders", async () => {
    for (const edges of permutations(triangleAndChain)) {
      const { repository } = fixture(edges);
      const graph = await repository.getRelationGraph("A", 3);
      expect({
        order: edges,
        nodes: graph.nodes.map((node) => node.id).sort(),
        edges: graph.edges.map((edge) => edge.id).sort(),
      }).toEqual({
        order: edges,
        nodes: ["A", "B", "C", "D", "E"],
        edges: ["A>B", "A>C", "B>C", "C>D", "D>E"],
      });
    }
  });

  it("stops querying at the depth boundary without losing boundary nodes", async () => {
    const { repository, findUnique, findMany } = fixture([
      ...triangleAndChain,
      ["E", "F"],
    ]);
    const graph = await repository.getRelationGraph("A", 3);
    expect(graph.nodes.map((node) => node.id).sort()).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
    ]);
    expect(
      findUnique.mock.calls.map(([query]) => query.where.id).sort(),
    ).toEqual(["A", "B", "C", "D"]);
    expect(findMany).toHaveBeenCalledTimes(4);
  });

  it("includes only root edges at depth 1 and preserves incoming orientation", async () => {
    const { repository } = fixture([
      ["A", "B"],
      ["B", "C"],
      ["C", "A"],
    ]);
    const graph = await repository.getRelationGraph("A", 1);
    expect(graph.nodes.map((node) => node.id).sort()).toEqual(["A", "B", "C"]);
    expect(graph.edges.map((edge) => edge.id).sort()).toEqual(["A>B", "C>A"]);
    expect(graph.edges.find((edge) => edge.id === "C>A")).toMatchObject({
      sourceId: "C",
      targetId: "A",
      type: RelationType.is_part_of,
    });
  });

  it("visits each application once despite cycles and a self relation", async () => {
    const { repository, findUnique, findMany } = fixture([
      ["A", "B"],
      ["B", "C"],
      ["C", "A"],
      ["B", "B"],
    ]);
    const graph = await repository.getRelationGraph("A", 100);
    expect(graph.nodes.map((node) => node.id).sort()).toEqual(["A", "B", "C"]);
    expect(graph.edges.map((edge) => edge.id).sort()).toEqual([
      "A>B",
      "B>B",
      "B>C",
      "C>A",
    ]);
    expect(findUnique).toHaveBeenCalledTimes(3);
    expect(findMany).toHaveBeenCalledTimes(3);
  });

  it("does not cross deleted applications but traverses decommissioned and statusless ones", async () => {
    const { repository } = fixture(
      [
        ["A", "B"],
        ["B", "C"],
        ["A", "D"],
        ["D", "E"],
      ],
      { B: Status.deleted, D: Status.decommissioned, E: null },
    );
    const graph = await repository.getRelationGraph("A", 3);
    expect(graph.nodes.map((node) => node.id).sort()).toEqual(["A", "D", "E"]);
    expect(graph.edges.map((edge) => edge.id).sort()).toEqual(["A>D", "D>E"]);
    expect(graph.nodes.find((node) => node.id === "D")?.status).toBe(
      Status.decommissioned,
    );
    expect(graph.nodes.find((node) => node.id === "E")?.status).toBeUndefined();
    expect(await repository.getRelationGraph("B", 3)).toEqual({
      rootId: "B",
      nodes: [],
      edges: [],
    });
  });

  it("returns an isolated root and an empty graph for a missing root", async () => {
    const { repository } = fixture([], {}, ["A"]);
    expect(await repository.getRelationGraph("A", 3)).toEqual({
      rootId: "A",
      nodes: [{ id: "A", label: "A", status: Status.in_production }],
      edges: [],
    });
    expect(await repository.getRelationGraph("missing", 3)).toEqual({
      rootId: "missing",
      nodes: [],
      edges: [],
    });
  });
});
