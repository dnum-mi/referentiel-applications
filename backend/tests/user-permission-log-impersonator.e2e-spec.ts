import type { UserFakerReturnType } from "./fakers/user.faker";
import { Roles } from "@prisma/client";
import request from "supertest";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

const IMPERSONATE_HEADER = "x-impersonate-user-id";

describe("UserPermissionLog — impersonator (#2061)", () => {
  const app = setupTestSuite();

  let realAdmin: UserFakerReturnType;
  let impersonatedAdmin: UserFakerReturnType;
  let target: UserFakerReturnType;
  let REAL_ADMIN_TOKEN: string;

  beforeAll(async () => {
    realAdmin = await UserFaker.create({ role: Roles.ADMIN });
    // Un admin peut impersonner un autre admin (seule l'auto-impersonation est bloquée) :
    // c'est le cas qui exposait le trou de traçabilité (#2061).
    impersonatedAdmin = await UserFaker.create({ role: Roles.ADMIN });
    target = await UserFaker.create({ role: Roles.VISITOR });
    REAL_ADMIN_TOKEN = await getToken(realAdmin);
  });

  it("renseigne l'admin réel quand les droits d'un utilisateur sont modifiés sous impersonation", async () => {
    await request(app().getHttpServer())
      .patch(`/users/${target.id}`)
      .send({ role: Roles.CONTRIBUTOR, additionalPermissions: [] })
      .set("Authorization", `Bearer ${REAL_ADMIN_TOKEN}`)
      .set(IMPERSONATE_HEADER, impersonatedAdmin.id)
      .expect(200);

    const prisma = getPrismaClient();
    const log = await prisma.userPermissionLog.findFirst({
      where: { userId: target.id },
      orderBy: { createdAt: "desc" },
    });

    expect(log).not.toBeNull();
    expect(log!.changedById).toBe(impersonatedAdmin.id);
    expect(log!.impersonatorId).toBe(realAdmin.id);

    const response = await request(app().getHttpServer())
      .get(`/users/${target.id}/permission-logs`)
      .set("Authorization", `Bearer ${REAL_ADMIN_TOKEN}`)
      .expect(200);

    const entry = response.body.find((l: { id: string }) => l.id === log!.id);
    expect(entry).toBeDefined();
    expect(entry.changedByEmail).toBe(impersonatedAdmin.email);
    expect(entry.impersonatorEmail).toBe(realAdmin.email);

    // Le champ dénormalisé sur User (utilisé par la liste admin des utilisateurs) doit lui
    // aussi porter l'admin réel, pas seulement le log détaillé.
    const updatedTarget = await prisma.user.findUniqueOrThrow({
      where: { id: target.id },
    });
    expect(updatedTarget.lastPermissionChangedById).toBe(impersonatedAdmin.id);
    expect(updatedTarget.lastPermissionChangedByImpersonatorId).toBe(
      realAdmin.id,
    );

    const usersResponse = await request(app().getHttpServer())
      .get("/users")
      .query({ search: target.email })
      .set("Authorization", `Bearer ${REAL_ADMIN_TOKEN}`)
      .expect(200);

    const userEntry = usersResponse.body.results.find(
      (u: { id: string }) => u.id === target.id,
    );
    expect(userEntry).toBeDefined();
    expect(userEntry.lastPermissionChangedByEmail).toBe(
      impersonatedAdmin.email,
    );
    expect(userEntry.lastPermissionChangedByImpersonatorEmail).toBe(
      realAdmin.email,
    );
  });

  it("laisse impersonatorId vide hors impersonation", async () => {
    await request(app().getHttpServer())
      .patch(`/users/${target.id}`)
      .send({ role: Roles.READER, additionalPermissions: [] })
      .set("Authorization", `Bearer ${REAL_ADMIN_TOKEN}`)
      .expect(200);

    const prisma = getPrismaClient();
    const log = await prisma.userPermissionLog.findFirst({
      where: { userId: target.id },
      orderBy: { createdAt: "desc" },
    });

    expect(log).not.toBeNull();
    expect(log!.changedById).toBe(realAdmin.id);
    expect(log!.impersonatorId).toBeNull();

    const updatedTarget = await prisma.user.findUniqueOrThrow({
      where: { id: target.id },
    });
    expect(updatedTarget.lastPermissionChangedByImpersonatorId).toBeNull();
  });
});
