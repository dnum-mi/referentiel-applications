import type { UserFakerReturnType } from "./fakers/user.faker";
import { RelationType, Roles } from "@prisma/client";
import request from "supertest";
import { ActorTypeFaker } from "./fakers/actor-type.faker";
import { ApplicationFaker } from "./fakers/application.faker";
import { HostingFaker } from "./fakers/hosting.faker";
import { HostingOptionFaker } from "./fakers/hosting-option.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

/**
 * #2367 / #2368 — Les sous-ressources d'une application (relations, acteurs, hébergements) doivent
 * être scopées à l'`:applicationId` de la route. Un utilisateur autorisé sur l'application A ne doit
 * jamais pouvoir lire, modifier, supprimer ou reparenter la ressource d'une application B via une
 * URL `/applications/A/...`. Le requêteur ici est un CONTRIBUTOR sans périmètre : son rôle lui donne
 * les droits d'écriture sur TOUTE application, ce qui isole bien le défaut d'autorisation par
 * ressource (le garde de permission passe ; seul le scoping de la ressource protège).
 */
describe("Scoping inter-applications des sous-ressources (#2367, #2368)", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();

  let user: UserFakerReturnType;
  let TOKEN: string;
  let appA: { id: string };
  let appB: { id: string };

  beforeAll(async () => {
    user = await UserFaker.create({ role: Roles.CONTRIBUTOR });
    TOKEN = await getToken(user);
    appA = await ApplicationFaker.create(user);
    appB = await ApplicationFaker.create(user);
  });

  describe("Hébergements", () => {
    it("interdit de lire/modifier/supprimer un hébergement de B via A (404)", async () => {
      const option = await HostingOptionFaker.create();
      const hostingB = await HostingFaker.create({
        application: appB,
        hostingOption: option,
        user,
      });
      const server = app().getHttpServer();
      const via = (method: "get" | "patch" | "delete") =>
        request(server)
          [method](`/applications/${appA.id}/hostings/${hostingB.id}`)
          .set("Authorization", `Bearer ${TOKEN}`);

      await via("get").expect(404);
      await via("patch").send({ label: "pirate" }).expect(404);
      await via("delete").expect(404);

      // L'hébergement de B est intact et toujours rattaché à B.
      const still = await prisma.hosting.findUnique({
        where: { id: hostingB.id },
      });
      expect(still?.applicationId).toBe(appB.id);
    });
  });

  describe("Acteurs", () => {
    it("interdit de lire/modifier/supprimer un acteur de B via A (404)", async () => {
      const actorType = await ActorTypeFaker.create(["ActorRead"]);
      const actorB = await prisma.actor.create({
        data: {
          applicationId: appB.id,
          actorTypeId: actorType.id,
          email: "cible@example.com",
          firstname: "Cible",
          lastname: "B",
        },
      });
      const server = app().getHttpServer();

      await request(server)
        .get(`/applications/${appA.id}/actors/${actorB.id}`)
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(404);
      await request(server)
        .delete(`/applications/${appA.id}/actors/${actorB.id}`)
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(404);

      const still = await prisma.actor.findUnique({
        where: { id: actorB.id },
      });
      expect(still).not.toBeNull();
      expect(still?.applicationId).toBe(appB.id);
    });

    // #2368 : reparenter son propre acteur vers une autre application, via le body, permettait
    // d'hériter des droits du type d'acteur sur cette application. Le champ doit être ignoré.
    it("ignore applicationId dans le body du PATCH acteur (pas de reparentage)", async () => {
      const actorType = await ActorTypeFaker.create(["ActorWrite"]);
      const actorA = await prisma.actor.create({
        data: {
          applicationId: appA.id,
          actorTypeId: actorType.id,
          email: "moi@example.com",
          firstname: "Moi",
          lastname: "A",
        },
      });

      await request(app().getHttpServer())
        .patch(`/applications/${appA.id}/actors/${actorA.id}`)
        .send({ firstname: "Modifié", applicationId: appB.id })
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(200);

      const after = await prisma.actor.findUnique({
        where: { id: actorA.id },
      });
      expect(after?.applicationId).toBe(appA.id); // toujours dans A
      expect(after?.firstname).toBe("Modifié"); // la mise à jour légitime a bien eu lieu
    });
  });

  describe("Relations", () => {
    it("interdit de modifier/supprimer une relation hors de A via A (404)", async () => {
      const appC = await ApplicationFaker.create(user);
      const relationBC = await prisma.relation.create({
        data: {
          applicationSourceId: appB.id,
          applicationTargetId: appC.id,
          type: RelationType.is_part_of,
        },
      });
      const server = app().getHttpServer();

      await request(server)
        .patch(`/applications/${appA.id}/relations/${relationBC.id}`)
        .send({
          applicationTargetId: appC.id,
          type: RelationType.is_data_user_of,
          mediationServiceId: null,
        })
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(404);
      await request(server)
        .delete(`/applications/${appA.id}/relations/${relationBC.id}`)
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(404);

      const still = await prisma.relation.findUnique({
        where: { id: relationBC.id },
      });
      expect(still?.type).toBe(RelationType.is_part_of); // inchangée
    });
  });
});
