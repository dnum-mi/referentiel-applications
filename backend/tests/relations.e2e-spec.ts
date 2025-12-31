import type { AsyncReturnType } from "src/utils/types.util";
import type { UserFakerReturnType } from "./fakers/user.faker";
import { RelationType } from "@prisma/client";
import { AdminLevel } from "src/user/entities/user.entity";
import request from "supertest";
import { ActorTypeFaker } from "./fakers/actor-type.faker";
import { ActorFaker } from "./fakers/actor.faker";
import { ApplicationFaker } from "./fakers/application.faker";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("Relations End-to-End", () => {
  const app = setupTestSuite();
  let applicationSource: { id: string; label: string };
  let applicationTarget: { id: string; label: string };
  let applicationUpdates: { id: string; label: string };
  let user: UserFakerReturnType;
  let TOKEN: string;
  let relation: {
    id: string;
    applicationSourceId: string;
    applicationTargetId: string;
    type: string;
  };

  beforeAll(async () => {
    // Given
    user = await UserFaker.create({ adminLevel: AdminLevel.WRITE });
    TOKEN = await getToken(user);
    applicationSource = await ApplicationFaker.create(user);
    applicationTarget = await ApplicationFaker.create(user);
    applicationUpdates = await ApplicationFaker.create(user);
  });

  it("should create a relation when provided with a valid DTO", async () => {
    // Given
    const applicationSourceId = applicationSource.id;
    const dto = {
      applicationTargetId: applicationTarget.id,
      type: RelationType.is_part_of,
    };

    // When
    const response = await request(app().getHttpServer())
      .post(`/applications/${applicationSourceId}/relations`)
      .send(dto)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);

    // Then
    relation = response.body;
    expect(relation).toMatchObject(dto);
    expect(relation.id).toBeDefined();
  });

  it("should retrieve all relations for an application", async () => {
    const applicationSourceId = applicationSource.id;
    // When
    const response = await request(app().getHttpServer())
      .get(`/applications/${applicationSourceId}/relations`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    // Then
    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toBeGreaterThanOrEqual(1);
    response.body.forEach((relation) => {
      expect(Object.values(relation)).toContain(applicationSourceId);
    });
  });

  it("should retrieve a relation by its id", async () => {
    const applicationSourceId = applicationSource.id;
    // When
    const response = await request(app().getHttpServer())
      .get(`/applications/${applicationSourceId}/relations/${relation.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    // Then
    expect(response.body).toMatchObject({
      id: relation.id,
      sourceApplication: {
        id: applicationSource.id,
        label: applicationSource.label,
      },
      targetApplication: {
        id: applicationTarget.id,
        label: applicationTarget.label,
      },
      type: relation.type,
    });
  });

  it("should update a relation with valid data", async () => {
    const applicationSourceId = applicationSource.id;
    // Given
    const updatedDto = {
      applicationTargetId: applicationUpdates.id,
      type: RelationType.in_replacement_of,
    };

    // When
    const response = await request(app().getHttpServer())
      .patch(`/applications/${applicationSourceId}/relations/${relation.id}`)
      .send(updatedDto)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    // Then: la relation doit être mise à jour avec la nouvelle applicationTarget
    relation = response.body;
    expect(relation.type).toEqual(RelationType.in_replacement_of);
    expect(relation.applicationTargetId).toEqual(applicationUpdates.id);
  });

  it("should delete a relation", async () => {
    const applicationSourceId = applicationSource.id;
    // When
    await request(app().getHttpServer())
      .delete(`/applications/${applicationSourceId}/relations/${relation.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(204);
  });

  it("should return 404 when retrieving a deleted relation", async () => {
    const applicationSourceId = applicationSource.id;
    // When
    await request(app().getHttpServer())
      .get(`/applications/${applicationSourceId}/relations/${relation.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(404);
  });
});

describe("Relations Graph End-to-End", () => {
  const app = setupTestSuite();
  let user: UserFakerReturnType;
  let TOKEN: string;
  let rootApp: { id: string; label: string };
  let childApp1: { id: string; label: string };
  let childApp2: { id: string; label: string };
  let grandchildApp: { id: string; label: string };
  let deletedApp: { id: string; label: string };

  beforeAll(async () => {
    user = await UserFaker.create({ adminLevel: AdminLevel.WRITE });
    TOKEN = await getToken(user);

    rootApp = await ApplicationFaker.create(user);
    childApp1 = await ApplicationFaker.create(user);
    childApp2 = await ApplicationFaker.create(user);
    grandchildApp = await ApplicationFaker.create(user);
    deletedApp = await ApplicationFaker.create(user);

    await request(app().getHttpServer())
      .post(`/applications/${rootApp.id}/relations`)
      .send({
        applicationTargetId: childApp1.id,
        type: RelationType.is_part_of,
      })
      .set("Authorization", `Bearer ${TOKEN}`);

    await request(app().getHttpServer())
      .post(`/applications/${rootApp.id}/relations`)
      .send({
        applicationTargetId: childApp2.id,
        type: RelationType.is_service_user_of,
      })
      .set("Authorization", `Bearer ${TOKEN}`);

    await request(app().getHttpServer())
      .post(`/applications/${childApp1.id}/relations`)
      .send({
        applicationTargetId: grandchildApp.id,
        type: RelationType.in_replacement_of,
      })
      .set("Authorization", `Bearer ${TOKEN}`);

    await request(app().getHttpServer())
      .post(`/applications/${rootApp.id}/relations`)
      .send({
        applicationTargetId: deletedApp.id,
        type: RelationType.is_data_user_of,
      })
      .set("Authorization", `Bearer ${TOKEN}`);
  });

  it("should retrieve relation graph with default depth", async () => {
    // When
    const response = await request(app().getHttpServer())
      .get(`/applications/${rootApp.id}/relations/graph`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    // Then
    expect(response.body).toHaveProperty("nodes");
    expect(response.body).toHaveProperty("edges");
    expect(response.body).toHaveProperty("rootId");
    expect(response.body.rootId).toBe(rootApp.id);
    expect(Array.isArray(response.body.nodes)).toBeTruthy();
    expect(Array.isArray(response.body.edges)).toBeTruthy();

    const nodeIds = response.body.nodes.map((n) => n.id);
    expect(nodeIds).toContain(rootApp.id);
    expect(nodeIds).toContain(childApp1.id);
    expect(nodeIds).toContain(childApp2.id);
  });

  it("should retrieve relation graph with depth=1", async () => {
    // When
    const response = await request(app().getHttpServer())
      .get(`/applications/${rootApp.id}/relations/graph?depth=1`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    // Then
    const nodeIds = response.body.nodes.map((n) => n.id);
    expect(nodeIds).toContain(rootApp.id);
    expect(nodeIds).toContain(childApp1.id);
    expect(nodeIds).toContain(childApp2.id);
    expect(nodeIds).not.toContain(grandchildApp.id);
  });

  it("should retrieve relation graph with depth=3", async () => {
    // When
    const response = await request(app().getHttpServer())
      .get(`/applications/${rootApp.id}/relations/graph?depth=3`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    // Then
    const nodeIds = response.body.nodes.map((n) => n.id);
    expect(nodeIds).toContain(rootApp.id);
    expect(nodeIds).toContain(childApp1.id);
    expect(nodeIds).toContain(childApp2.id);
    expect(nodeIds).toContain(grandchildApp.id);
  });

  it("should include labels in all nodes", async () => {
    // When
    const response = await request(app().getHttpServer())
      .get(`/applications/${rootApp.id}/relations/graph?depth=3`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    // Then
    response.body.nodes.forEach((node) => {
      expect(node).toHaveProperty("id");
      expect(node).toHaveProperty("label");
      expect(typeof node.label).toBe("string");
      expect(node.label).not.toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });

  it("should include sourceLabel and targetLabel in all edges", async () => {
    // When
    const response = await request(app().getHttpServer())
      .get(`/applications/${rootApp.id}/relations/graph?depth=3`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    // Then
    response.body.edges.forEach((edge) => {
      expect(edge).toHaveProperty("id");
      expect(edge).toHaveProperty("sourceId");
      expect(edge).toHaveProperty("sourceLabel");
      expect(edge).toHaveProperty("targetId");
      expect(edge).toHaveProperty("targetLabel");
      expect(edge).toHaveProperty("type");
      expect(typeof edge.sourceLabel).toBe("string");
      expect(typeof edge.targetLabel).toBe("string");
    });
  });

  it("should require authentication", async () => {
    // When
    await request(app().getHttpServer())
      .get(`/applications/${rootApp.id}/relations/graph`)
      .expect(401);
  });

  it("should enforce read permissions", async () => {
    const limitedUser = await UserFaker.create();
    const limitedToken = await getToken(limitedUser);
    const testApp = await ApplicationFaker.create(user);

    // When
    await request(app().getHttpServer())
      .get(`/applications/${testApp.id}/relations/graph`)
      .set("Authorization", `Bearer ${limitedToken}`)
      .expect(403);
  });

  it("should cap depth at maximum value", async () => {
    const response = await request(app().getHttpServer())
      .get(`/applications/${rootApp.id}/relations/graph?depth=100`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body).toHaveProperty("nodes");
    expect(response.body).toHaveProperty("edges");
  });
});

describe("application guard", () => {
  const app = setupTestSuite();
  let appOwner: UserFakerReturnType;
  let appActor: UserFakerReturnType;
  let TOKEN: string;
  let actorType: AsyncReturnType<typeof ActorTypeFaker.create>;
  let actor: AsyncReturnType<typeof ActorFaker.link>;
  let application: AsyncReturnType<typeof ApplicationFaker.create>;
  let applicationTarget: AsyncReturnType<typeof ApplicationFaker.create>;

  beforeAll(async () => {
    appOwner = await UserFaker.create();
    appActor = await UserFaker.create();
    application = await ApplicationFaker.create(appOwner);
    applicationTarget = await ApplicationFaker.create(appOwner);
    actorType = await ActorTypeFaker.create(["readRelations"]);
    actor = await ActorFaker.link({
      userEmail: appActor.email,
      actorTypeId: actorType.id,
      applicationId: application.id,
    });
    TOKEN = await getToken(appActor);
  });

  afterAll(async () => {
    await actor.delete();
    await actorType.delete();
  });

  it("permissions testing", async () => {
    // Should fail because the user does not have the write permission
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/relations`)
      .send({
        applicationTargetId: applicationTarget.id,
        type: RelationType.is_part_of,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Should succeed after granting the write permission
    await actorType.update(["writeRelations"]);
    const relation = await request(app().getHttpServer())
      .post(`/applications/${application.id}/relations`)
      .send({
        applicationTargetId: applicationTarget.id,
        type: RelationType.is_part_of,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);
    const relationId = relation.body.id;
    expect(relationId).toBeDefined();

    // remove all permission
    await actorType.update([], { reset: true });
    // Should fail to get the relation because the user does not have the read permission
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/relations/${relationId}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Should fail to list relations because the user does not have the read permission
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/relations`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Should fail to get graph because the user does not have the read permission
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/relations/graph`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Add read permission
    await actorType.update(["readRelations"]);

    // Should succeed to get the relation
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/relations/${relationId}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
    // Should succeed to list relations
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/relations`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    // Should succeed to get graph
    await request(app().getHttpServer())
      .get(`/applications/${application.id}/relations/graph`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    // should fail on write permission
    await request(app().getHttpServer())
      .patch(`/applications/${application.id}/relations/${relationId}`)
      .send({
        applicationTargetId: applicationTarget.id,
        type: RelationType.in_replacement_of,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    await request(app().getHttpServer())
      .delete(`/applications/${application.id}/relations/${relationId}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);

    // Add write permission again
    await actorType.update(["writeRelations"]);

    // Should succeed to update the relation
    await request(app().getHttpServer())
      .patch(`/applications/${application.id}/relations/${relationId}`)
      .send({
        applicationTargetId: applicationTarget.id,
        type: RelationType.in_replacement_of,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    await request(app().getHttpServer())
      .delete(`/applications/${application.id}/relations/${relationId}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(204);
  });
});
