import type { RelationGraphDto } from "src/relationship/application/dto/relation-application.dto";
import type { UserFakerReturnType } from "./fakers/user.faker";
import { randomUUID } from "node:crypto";
import { RelationType, Roles, Status } from "@prisma/client";
import request from "supertest";
import { ApplicationFaker } from "./fakers/application.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

type NodeName = "A" | "B" | "C" | "D" | "E" | "F";
type ApplicationReference = { id: string; label: string };
interface GraphFixture {
  prefix: string;
  applications: Map<NodeName, ApplicationReference>;
}

describe("Graphe des relations — profondeur par distance minimale (#2937)", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  const suffix = randomUUID();
  let owner: UserFakerReturnType;
  let token: string;
  let forwardGraph: GraphFixture;
  let reverseGraph: GraphFixture;
  let statusRoot: ApplicationReference;
  let deleted: ApplicationReference;
  let behindDeleted: ApplicationReference;
  let decommissioned: ApplicationReference;
  let behindDecommissioned: ApplicationReference;

  function application(fixture: GraphFixture, name: NodeName) {
    const found = fixture.applications.get(name);
    if (!found) throw new Error(`Application ${name} absente de la fixture`);
    return found;
  }

  async function createApplication(label: string, status?: Status) {
    const created = await ApplicationFaker.create(owner);
    await prisma.application.update({
      where: { id: created.id },
      data: { label },
    });
    if (status) {
      const currentStatus = await prisma.applicationStatus.create({
        data: { applicationId: created.id, status },
      });
      await prisma.application.update({
        where: { id: created.id },
        data: { currentStatusId: currentStatus.id },
      });
    }
    return { id: created.id, label };
  }

  async function createRelation(
    source: ApplicationReference,
    target: ApplicationReference,
  ) {
    await request(app().getHttpServer())
      .post(`/applications/${source.id}/relations`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        applicationTargetId: target.id,
        type: RelationType.is_service_user_of,
      })
      .expect(201);
  }

  async function createGraph(
    prefix: string,
    reverse: boolean,
  ): Promise<GraphFixture> {
    const names: NodeName[] = ["A", "B", "C", "D", "E", "F"];
    const fixture: GraphFixture = { prefix, applications: new Map() };
    for (const name of reverse ? [...names].reverse() : names) {
      fixture.applications.set(
        name,
        await createApplication(`${prefix}:${name}`),
      );
    }

    // Le triangle est cyclique et C → A est entrant sur la racine :
    // A → B → C → A, puis C → D → E → F. C est à distance 1 de A,
    // même si une première exploration peut l'atteindre via B.
    const edges: [NodeName, NodeName][] = [
      ["A", "B"],
      ["B", "C"],
      ["C", "A"],
      ["C", "D"],
      ["D", "E"],
      ["E", "F"],
    ];
    for (const [source, target] of reverse ? [...edges].reverse() : edges) {
      await createRelation(
        application(fixture, source),
        application(fixture, target),
      );
    }
    return fixture;
  }

  async function getGraph(root: ApplicationReference, depth: number) {
    const response = await request(app().getHttpServer())
      .get(`/applications/${root.id}/relations/graph`)
      .query({ depth })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const graph = response.body as RelationGraphDto;
    expect(graph.rootId).toBe(root.id);
    expect(new Set(graph.nodes.map((node) => node.id)).size).toBe(
      graph.nodes.length,
    );
    expect(new Set(graph.edges.map((edge) => edge.id)).size).toBe(
      graph.edges.length,
    );
    expect(
      new Set(
        graph.edges.map(
          (edge) => `${edge.sourceId}:${edge.type}:${edge.targetId}`,
        ),
      ).size,
    ).toBe(graph.edges.length);
    const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
    for (const edge of graph.edges) {
      expect(nodesById.get(edge.sourceId)?.label).toBe(edge.sourceLabel);
      expect(nodesById.get(edge.targetId)?.label).toBe(edge.targetLabel);
    }
    return graph;
  }

  function normalize(graph: RelationGraphDto, prefix: string) {
    const label = (value: string) => value.slice(prefix.length + 1);
    return {
      nodes: graph.nodes.map((node) => label(node.label)).sort(),
      edges: graph.edges
        .map(
          (edge) =>
            `${label(edge.sourceLabel)}>${label(edge.targetLabel)}:${edge.type}`,
        )
        .sort(),
    };
  }

  function expectedEdges(pairs: string[]) {
    return pairs
      .map((pair) => `${pair}:${RelationType.is_service_user_of}`)
      .sort();
  }

  beforeAll(async () => {
    owner = await UserFaker.create({ role: Roles.CONTRIBUTOR });
    token = getToken(owner);
    forwardGraph = await createGraph(`forward-${suffix}`, false);
    reverseGraph = await createGraph(`reverse-${suffix}`, true);

    statusRoot = await createApplication(`status-root-${suffix}`);
    // Les arêtes sont créées avant le changement de statut, comme pour des
    // applications déjà reliées puis supprimées ou décommissionnées.
    deleted = await createApplication(`deleted-${suffix}`);
    behindDeleted = await createApplication(`behind-deleted-${suffix}`);
    decommissioned = await createApplication(`decommissioned-${suffix}`);
    behindDecommissioned = await createApplication(
      `behind-decommissioned-${suffix}`,
    );
    await createRelation(statusRoot, deleted);
    await createRelation(deleted, behindDeleted);
    await createRelation(decommissioned, statusRoot);
    await createRelation(decommissioned, behindDecommissioned);
    for (const [target, status] of [
      [deleted, Status.deleted],
      [decommissioned, Status.decommissioned],
    ] as const) {
      const currentStatus = await prisma.applicationStatus.create({
        data: { applicationId: target.id, status },
      });
      await prisma.application.update({
        where: { id: target.id },
        data: { currentStatusId: currentStatus.id },
      });
    }
  });

  describe.each(["forward", "reverse"] as const)("Création %s", (order) => {
    function fixture() {
      return order === "forward" ? forwardGraph : reverseGraph;
    }

    it("inclut E à profondeur 3 par le chemin court A–C–D–E, avec chaque arête une seule fois", async () => {
      const current = fixture();
      const graph = await getGraph(application(current, "A"), 3);
      expect(normalize(graph, current.prefix)).toEqual({
        nodes: ["A", "B", "C", "D", "E"],
        edges: expectedEdges(["A>B", "B>C", "C>A", "C>D", "D>E"]),
      });
      expect(graph.nodes.map((node) => node.id)).not.toContain(
        application(current, "F").id,
      );
    });

    it("limite profondeur 1 aux voisins immédiats et aux seules arêtes de la racine", async () => {
      const current = fixture();
      const graph = await getGraph(application(current, "A"), 1);
      expect(normalize(graph, current.prefix)).toEqual({
        nodes: ["A", "B", "C"],
        edges: expectedEdges(["A>B", "C>A"]),
      });
    });

    it("respecte la frontière de profondeur 2 sans traverser D jusqu'à E", async () => {
      const current = fixture();
      const graph = await getGraph(application(current, "A"), 2);
      expect(normalize(graph, current.prefix)).toEqual({
        nodes: ["A", "B", "C", "D"],
        edges: expectedEdges(["A>B", "B>C", "C>A", "C>D"]),
      });
    });

    it("termine malgré le cycle et atteint toute la chaîne à profondeur 100 sans doublon", async () => {
      const current = fixture();
      const graph = await getGraph(application(current, "A"), 100);
      expect(normalize(graph, current.prefix)).toEqual({
        nodes: ["A", "B", "C", "D", "E", "F"],
        edges: expectedEdges(["A>B", "B>C", "C>A", "C>D", "D>E", "E>F"]),
      });
    });
  });

  it("renvoie des graphes équivalents après création des applications et relations dans des ordres inverses", async () => {
    const first = await getGraph(application(forwardGraph, "A"), 3);
    const second = await getGraph(application(reverseGraph, "A"), 3);
    expect(normalize(first, forwardGraph.prefix)).toEqual(
      normalize(second, reverseGraph.prefix),
    );
  });

  it("exclut les applications supprimées et ne les traverse pas, tout en conservant les décommissionnées", async () => {
    const graph = await getGraph(statusRoot, 3);
    expect(graph.nodes.map((node) => node.id).sort()).toEqual(
      [statusRoot.id, decommissioned.id, behindDecommissioned.id].sort(),
    );
    expect(graph.nodes.map((node) => node.id)).not.toContain(deleted.id);
    expect(graph.nodes.map((node) => node.id)).not.toContain(behindDeleted.id);
    expect(
      graph.nodes.find((node) => node.id === decommissioned.id)?.status,
    ).toBe(Status.decommissioned);
    expect(
      graph.edges.map((edge) => `${edge.sourceId}>${edge.targetId}`).sort(),
    ).toEqual(
      [
        `${decommissioned.id}>${statusRoot.id}`,
        `${decommissioned.id}>${behindDecommissioned.id}`,
      ].sort(),
    );
  });

  it("renvoie un graphe vide lorsque la racine est une application supprimée", async () => {
    const graph = await getGraph(deleted, 3);
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });
});
