import type { UserFakerReturnType } from "./fakers/user.faker";
import { Roles } from "@prisma/client";
import request from "supertest";
import { ApplicationFaker } from "./fakers/application.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

const IMPERSONATE_HEADER = "x-impersonate-user-id";

describe("Metadata — impersonator (#2226)", () => {
  const app = setupTestSuite();

  let admin: UserFakerReturnType;
  let target: UserFakerReturnType;
  let ADMIN_TOKEN: string;

  beforeAll(async () => {
    admin = await UserFaker.create({ role: Roles.ADMIN });
    target = await UserFaker.create({ role: Roles.ADMIN });
    ADMIN_TOKEN = await getToken(admin);
  });

  it("renseigne l'admin réel sur les metadata créées sous impersonation", async () => {
    const application = await ApplicationFaker.create(target);

    await request(app().getHttpServer())
      .patch(`/applications/${application.id}`)
      .send({ description: "Modifiée sous impersonation" })
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .set(IMPERSONATE_HEADER, target.id)
      .expect(200);

    const prisma = getPrismaClient();
    const metadata = await prisma.metadata.findFirst({
      where: { applicationId: application.id, action: "update" },
      orderBy: { createdAt: "desc" },
    });

    expect(metadata).not.toBeNull();
    expect(metadata!.createdById).toBe(target.id);
    expect(metadata!.impersonatorId).toBe(admin.id);
  });

  it("laisse impersonatorId vide hors impersonation", async () => {
    const application = await ApplicationFaker.create(admin);

    await request(app().getHttpServer())
      .patch(`/applications/${application.id}`)
      .send({ description: "Modifiée sans impersonation" })
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200);

    const prisma = getPrismaClient();
    const metadata = await prisma.metadata.findFirst({
      where: { applicationId: application.id, action: "update" },
      orderBy: { createdAt: "desc" },
    });

    expect(metadata).not.toBeNull();
    expect(metadata!.createdById).toBe(admin.id);
    expect(metadata!.impersonatorId).toBeNull();
  });

  it("expose l'impersonator dans l'API de consultation des metadata", async () => {
    const application = await ApplicationFaker.create(target);

    await request(app().getHttpServer())
      .patch(`/applications/${application.id}`)
      .send({ description: "Exposée via l'API" })
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .set(IMPERSONATE_HEADER, target.id)
      .expect(200);

    const response = await request(app().getHttpServer())
      .get(`/applications/${application.id}/metadatas`)
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200);

    const withImpersonator = response.body.results.find(
      (m: { impersonator?: { email: string } | null }) => m.impersonator,
    );
    expect(withImpersonator).toBeDefined();
    expect(withImpersonator.impersonator.email).toBe(admin.email);
    expect(withImpersonator.createdBy.email).toBe(target.email);
  });

  it("expose l'impersonator sur le résumé première/dernière metadata (bandeau de la fiche)", async () => {
    const application = await ApplicationFaker.create(target);

    await request(app().getHttpServer())
      .patch(`/applications/${application.id}`)
      .send({ description: "Dernière modification sous impersonation" })
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .set(IMPERSONATE_HEADER, target.id)
      .expect(200);

    const response = await request(app().getHttpServer())
      .get(`/applications/${application.id}/metadatas/first-last`)
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200);

    expect(response.body.last.impersonator?.email).toBe(admin.email);
    expect(response.body.last.createdBy.email).toBe(target.email);
  });
});
