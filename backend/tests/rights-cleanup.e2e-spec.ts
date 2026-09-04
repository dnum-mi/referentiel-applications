import { Roles } from "@prisma/client";
import request from "supertest";
import { ActorFaker } from "./fakers/actor.faker";
import { ActorTypeFaker } from "./fakers/actor-type.faker";
import { ApplicationFaker } from "./fakers/application.faker";
import { getPrismaClient } from "./fakers/prisma";
import type { UserFakerReturnType } from "./fakers/user.faker";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("Nettoyage des droits (#2506, #2510)", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();

  let admin: UserFakerReturnType;
  let contributor: UserFakerReturnType;
  let visitor: UserFakerReturnType;
  let application: Awaited<ReturnType<typeof ApplicationFaker.create>>;

  beforeAll(async () => {
    admin = await UserFaker.create({ role: Roles.ADMIN });
    contributor = await UserFaker.create({ role: Roles.CONTRIBUTOR });
    visitor = await UserFaker.create({ role: Roles.VISITOR });
    application = await ApplicationFaker.create(contributor);
  });

  describe("#2506 — DELETE /applications/:id exige DeleteApplication", () => {
    it("refuse le contributeur créateur de l'application", async () => {
      await request(app().getHttpServer())
        .delete(`/applications/${application.id}`)
        .set("Authorization", `Bearer ${getToken(contributor)}`)
        .expect(403);
    });

    it("refuse un visiteur", async () => {
      await request(app().getHttpServer())
        .delete(`/applications/${application.id}`)
        .set("Authorization", `Bearer ${getToken(visitor)}`)
        .expect(403);
    });

    it("accepte un administrateur", async () => {
      const victim = await ApplicationFaker.create(contributor);
      await request(app().getHttpServer())
        .delete(`/applications/${victim.id}`)
        .set("Authorization", `Bearer ${getToken(admin)}`)
        .expect(204);
    });
  });

  describe("#2510 — my-perms résout explicitement la couche applicative", () => {
    it("reflète le type d'acteur du visiteur nommé par e-mail", async () => {
      const actorType = await ActorTypeFaker.create(["AppRead", "AppWrite"]);
      const actor = await UserFaker.create({ role: Roles.VISITOR });
      await ActorFaker.link({
        userEmail: actor.email,
        actorTypeId: actorType.id,
        applicationId: application.id,
      });
      const res = await request(app().getHttpServer())
        .get(`/applications/${application.id}/my-perms`)
        .set("Authorization", `Bearer ${getToken(actor)}`)
        .expect(200);
      expect(res.body).toEqual(expect.arrayContaining(["AppRead", "AppWrite"]));
    });

    it("projette le rôle d'un contributeur non acteur (socle applicatif du rôle)", async () => {
      const res = await request(app().getHttpServer())
        .get(`/applications/${application.id}/my-perms`)
        .set("Authorization", `Bearer ${getToken(contributor)}`)
        .expect(200);
      expect(res.body).toEqual(
        expect.arrayContaining(["AppWrite", "ActorWrite", "TechnologyWrite"]),
      );
    });
  });

  describe("#2510 — un seul type d'acteur par défaut", () => {
    it("refuse en base un second type d'acteur isDefault", async () => {
      const existing = await prisma.actorType.count({
        where: { isDefault: true },
      });
      expect(existing).toBeLessThanOrEqual(1);
      await expect(
        prisma.actorType.create({
          data: { code: "DEFAULT-2", label: "Second défaut", isDefault: true },
        }),
      ).rejects.toMatchObject({ code: "P2002" });
    });
  });
});
