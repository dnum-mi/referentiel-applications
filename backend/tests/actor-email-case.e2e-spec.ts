import { Roles } from "@prisma/client";
import request from "supertest";
import { ActorTypeFaker } from "./fakers/actor-type.faker";
import { ActorFaker } from "./fakers/actor.faker";
import { ApplicationFaker } from "./fakers/application.faker";
import { getPrismaClient } from "./fakers/prisma";
import type { UserFakerReturnType } from "./fakers/user.faker";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

// #2501 : le rapprochement acteur ↔ utilisateur ne dépend plus de la casse des e-mails.
describe("E-mails : rapprochement insensible à la casse (#2501)", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  const suffix = Date.now();
  const email = `e2e-case-${suffix}@example.org`;

  let user: UserFakerReturnType;
  let owner: UserFakerReturnType;
  let admin: UserFakerReturnType;
  let application: Awaited<ReturnType<typeof ApplicationFaker.create>>;

  beforeAll(async () => {
    user = await UserFaker.create({ email });
    owner = await UserFaker.create({ role: Roles.CONTRIBUTOR });
    admin = await UserFaker.create({ role: Roles.ADMIN });
    application = await ApplicationFaker.create(owner);
  });

  afterAll(async () => {
    await ApplicationFaker.delete(application.id);
  });

  it("un acteur déclaré avec des majuscules donne ses droits au compte SSO en minuscules", async () => {
    const actorType = await ActorTypeFaker.create(["AppWrite"]);
    await ActorFaker.link({
      userEmail: `E2E-Case-${suffix}@EXAMPLE.org`,
      actorTypeId: actorType.id,
      applicationId: application.id,
    });

    await request(app().getHttpServer())
      .post(`/applications/${application.id}/technical-debt-info`)
      .send({ technicalMaturity: 2 })
      .set("Authorization", `Bearer ${getToken(user)}`)
      .expect(201);
  });

  it("une connexion SSO avec une autre graphie retrouve le même compte, sans doublon", async () => {
    const res = await request(app().getHttpServer())
      .get("/users/me")
      .set(
        "Authorization",
        `Bearer ${getToken({ email: email.toUpperCase() })}`,
      )
      .expect(200);
    expect(res.body.id).toBe(user.id);

    const count = await prisma.user.count({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    expect(count).toBe(1);
  });

  it("un nouveau compte SSO est créé en minuscules", async () => {
    const fresh = `E2E-New-${suffix}@Example.ORG`;
    const res = await request(app().getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${getToken({ email: fresh })}`)
      .expect(200);
    expect(res.body.email).toBe(fresh.toLowerCase());
  });

  it("un acteur créé ou modifié par l'API est stocké en minuscules", async () => {
    const actorType = await ActorTypeFaker.create(["AppRead"]);
    const created = await request(app().getHttpServer())
      .post(`/applications/${application.id}/actors`)
      .send({
        email: `Mixed.Case-${suffix}@Example.org`,
        firstname: "Prénom",
        lastname: "Nom",
        actorTypeId: actorType.id,
        isGroup: false,
      })
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .expect(201);
    expect(created.body.email).toBe(`mixed.case-${suffix}@example.org`);

    const updated = await request(app().getHttpServer())
      .patch(`/applications/${application.id}/actors/${created.body.id}`)
      .send({ email: `Other.Case-${suffix}@EXAMPLE.org` })
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .expect(200);
    expect(updated.body.email).toBe(`other.case-${suffix}@example.org`);
  });
});
