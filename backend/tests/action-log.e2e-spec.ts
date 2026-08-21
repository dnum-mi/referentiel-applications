import type { ActionLog } from "@prisma/client";
import type { UserFakerReturnType } from "./fakers/user.faker";
import { Roles } from "@prisma/client";
import request from "supertest";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

const IMPERSONATE_HEADER = "x-impersonate-user-id";

/** L'écriture du log est asynchrone (fire-and-forget) : on poll jusqu'à 2 s. */
async function waitForActionLog(
  where: Record<string, unknown>,
): Promise<ActionLog | null> {
  const prisma = getPrismaClient();
  for (let attempt = 0; attempt < 20; attempt++) {
    const log = await prisma.actionLog.findFirst({
      where,
      orderBy: { createdAt: "desc" },
    });
    if (log) return log;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return null;
}

describe("ActionLog — middleware de traçabilité (#2224)", () => {
  const app = setupTestSuite();

  let contributor: UserFakerReturnType;
  let admin: UserFakerReturnType;
  let target: UserFakerReturnType;
  let visitor: UserFakerReturnType;
  let CONTRIBUTOR_TOKEN: string;
  let ADMIN_TOKEN: string;
  let VISITOR_TOKEN: string;

  beforeAll(async () => {
    contributor = await UserFaker.create({ role: Roles.CONTRIBUTOR });
    admin = await UserFaker.create({ role: Roles.ADMIN });
    target = await UserFaker.create({ role: Roles.VISITOR });
    visitor = await UserFaker.create({ role: Roles.VISITOR });
    CONTRIBUTOR_TOKEN = await getToken(contributor);
    ADMIN_TOKEN = await getToken(admin);
    VISITOR_TOKEN = await getToken(visitor);
  });

  it("journalise une requête mutante avec l'identité effective", async () => {
    await request(app().getHttpServer())
      .post("/organizations")
      .set("Authorization", `Bearer ${CONTRIBUTOR_TOKEN}`)
      .send({ path: `E2E/ACTIONLOG/${Date.now()}` })
      .expect(201);

    const log = await waitForActionLog({
      userId: contributor.id,
      method: "POST",
      path: "/organizations",
    });
    expect(log).not.toBeNull();
    expect(log!.statusCode).toBe(201);
    expect(log!.impersonatorId).toBeNull();
    expect(log!.impersonationLogId).toBeNull();
  });

  it("ne journalise pas les lectures (GET)", async () => {
    await request(app().getHttpServer())
      .get("/organizations")
      .set("Authorization", `Bearer ${CONTRIBUTOR_TOKEN}`)
      .expect(200);

    // Laisse le temps à un éventuel log fautif d'être écrit.
    await new Promise((resolve) => setTimeout(resolve, 300));
    const prisma = getPrismaClient();
    const getLogs = await prisma.actionLog.count({
      where: { userId: contributor.id, method: "GET" },
    });
    expect(getLogs).toBe(0);
  });

  it("journalise les refus avec leur code de statut", async () => {
    await request(app().getHttpServer())
      .post("/organizations")
      .set("Authorization", `Bearer ${VISITOR_TOKEN}`)
      .send({ path: "E2E/ACTIONLOG/REFUSE" })
      .expect(403);

    const log = await waitForActionLog({
      userId: visitor.id,
      method: "POST",
      path: "/organizations",
    });
    expect(log).not.toBeNull();
    expect(log!.statusCode).toBe(403);
  });

  it("attribue les actions sous impersonation à l'admin réel et les rattache à la session", async () => {
    // Ouvre une session d'impersonation (crée l'ImpersonationLog).
    await request(app().getHttpServer())
      .post(`/users/${target.id}/impersonate`)
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200);

    const prisma = getPrismaClient();
    const session = await prisma.impersonationLog.findFirst({
      where: { adminId: admin.id, targetId: target.id, endedAt: null },
      orderBy: { startedAt: "desc" },
    });
    expect(session).not.toBeNull();

    // Action mutante effectuée SOUS l'identité de la cible (header posé).
    await request(app().getHttpServer())
      .patch("/users/me")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .set(IMPERSONATE_HEADER, target.id)
      .send({ emailNotificationsEnabled: false })
      .expect(200);

    const log = await waitForActionLog({
      userId: target.id,
      impersonatorId: admin.id,
      method: "PATCH",
    });
    expect(log).not.toBeNull();
    expect(log!.path).toBe("/users/me");
    expect(log!.impersonationLogId).toBe(session!.id);
  });
});
