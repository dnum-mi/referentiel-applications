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

describe("GET /action-logs — consultation du journal d'audit (#2061)", () => {
  const app = setupTestSuite();

  let admin: UserFakerReturnType;
  let target: UserFakerReturnType;
  let contributor: UserFakerReturnType;
  let ADMIN_TOKEN: string;
  let CONTRIBUTOR_TOKEN: string;

  beforeAll(async () => {
    admin = await UserFaker.create({ role: Roles.ADMIN });
    target = await UserFaker.create({ role: Roles.VISITOR });
    contributor = await UserFaker.create({ role: Roles.CONTRIBUTOR });
    ADMIN_TOKEN = await getToken(admin);
    CONTRIBUTOR_TOKEN = await getToken(contributor);
  });

  it("refuse l'accès à un non-admin (403)", async () => {
    await request(app().getHttpServer())
      .get("/action-logs")
      .set("Authorization", `Bearer ${CONTRIBUTOR_TOKEN}`)
      .expect(403);
  });

  it("expose l'identité effective et l'admin réel pour une action sous impersonation", async () => {
    await request(app().getHttpServer())
      .patch("/users/me")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .set(IMPERSONATE_HEADER, target.id)
      .send({ emailNotificationsEnabled: false })
      .expect(200);

    const written = await waitForActionLog({
      userId: target.id,
      impersonatorId: admin.id,
      path: "/users/me",
    });
    expect(written).not.toBeNull();

    const response = await request(app().getHttpServer())
      .get("/action-logs")
      .query({ search: target.email, pageSize: 50 })
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200);

    const entry = response.body.results.find(
      (log: { id: string }) => log.id === written!.id,
    );
    expect(entry).toBeDefined();
    expect(entry.user.email).toBe(target.email);
    expect(entry.impersonator.email).toBe(admin.email);
  });
});
