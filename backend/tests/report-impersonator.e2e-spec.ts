import type { UserFakerReturnType } from "./fakers/user.faker";
import { Permission, Roles } from "@prisma/client";
import request from "supertest";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

const IMPERSONATE_HEADER = "x-impersonate-user-id";

describe("Report — impersonator (#2061)", () => {
  const app = setupTestSuite();

  let admin: UserFakerReturnType;
  let target: UserFakerReturnType;
  let ADMIN_TOKEN: string;

  beforeAll(async () => {
    admin = await UserFaker.create({ role: Roles.ADMIN });
    target = await UserFaker.create({
      role: Roles.READER,
      additionalPermissions: [Permission.CreateGlobalReport],
    });
    ADMIN_TOKEN = await getToken(admin);
  });

  it("renseigne l'admin réel sur les signalements créés sous impersonation", async () => {
    const response = await request(app().getHttpServer())
      .post("/reports")
      .send({ description: "Signalement sous impersonation" })
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .set(IMPERSONATE_HEADER, target.id)
      .expect(201);

    expect(response.body.notifier.email).toBe(target.email);
    expect(response.body.impersonator?.email).toBe(admin.email);

    const prisma = getPrismaClient();
    const report = await prisma.report.findUnique({
      where: { id: response.body.id },
    });

    expect(report).not.toBeNull();
    expect(report!.notifierId).toBe(target.id);
    expect(report!.impersonatorId).toBe(admin.id);
  });

  it("laisse impersonatorId vide hors impersonation", async () => {
    const TARGET_TOKEN = await getToken(target);

    const response = await request(app().getHttpServer())
      .post("/reports")
      .send({ description: "Signalement sans impersonation" })
      .set("Authorization", `Bearer ${TARGET_TOKEN}`)
      .expect(201);

    expect(response.body.impersonator).toBeFalsy();

    const prisma = getPrismaClient();
    const report = await prisma.report.findUnique({
      where: { id: response.body.id },
    });

    expect(report).not.toBeNull();
    expect(report!.notifierId).toBe(target.id);
    expect(report!.impersonatorId).toBeNull();
  });
});
