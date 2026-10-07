import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { User } from "@prisma/client";
import { NotificationType, Roles } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "src/prisma/prisma.service";
import request from "supertest";
import { getToken } from "./getToken";
import { setupApp } from "./setup";

interface NotificationPage {
  results: { id: string; isRead: boolean; createdAt: string }[];
  total: number;
}

describe("Notifications — contrat HTTP (#2297)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let owner: User;
  let otherUser: User;
  let ownerToken: string;
  let otherToken: string;
  const userIds: string[] = [];
  const fixtureKey = randomUUID();
  const [tieLowId, tieMiddleId, tieHighId] = [
    randomUUID(),
    randomUUID(),
    randomUUID(),
  ].sort();
  const oldestId = randomUUID();
  const newestId = randomUUID();
  const foreignIds = [randomUUID(), randomUUID()];
  const descendingIds = [newestId, tieHighId, tieMiddleId, tieLowId, oldestId];
  const unreadIds = [newestId, tieHighId, tieLowId];
  const readIds = [tieMiddleId, oldestId];

  const list = (token: string, query: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .get("/notifications")
      .set("Authorization", `Bearer ${token}`)
      .query(query);

  const unreadCount = (token: string) =>
    request(app.getHttpServer())
      .get("/notifications/unread-count")
      .set("Authorization", `Bearer ${token}`);

  beforeAll(async () => {
    app = await setupApp();
    prisma = app.get(PrismaService);
    owner = await prisma.user.create({
      data: {
        email: `notifications-${fixtureKey}-owner@example.test`,
        role: Roles.VISITOR,
        additionalPermissions: [],
      },
    });
    userIds.push(owner.id);
    otherUser = await prisma.user.create({
      data: {
        email: `notifications-${fixtureKey}-other@example.test`,
        role: Roles.VISITOR,
        additionalPermissions: [],
      },
    });
    userIds.push(otherUser.id);
    ownerToken = getToken(owner);
    otherToken = getToken(otherUser);
  });

  beforeEach(async () => {
    await prisma.notification.deleteMany({
      where: { userId: { in: userIds } },
    });
    const common = {
      type: NotificationType.report_created,
      message: `Notification de test ${fixtureKey}`,
    };
    const tiedDate = new Date("2026-01-02T12:00:00.000Z");
    // L'ordre d'insertion diffère de celui attendu, y compris à date égale.
    await prisma.notification.createMany({
      data: [
        {
          ...common,
          id: tieMiddleId,
          userId: owner.id,
          isRead: true,
          createdAt: tiedDate,
        },
        {
          ...common,
          id: oldestId,
          userId: owner.id,
          isRead: true,
          createdAt: new Date("2026-01-01T12:00:00.000Z"),
        },
        {
          ...common,
          id: tieHighId,
          userId: owner.id,
          isRead: false,
          createdAt: tiedDate,
        },
        {
          ...common,
          id: newestId,
          userId: owner.id,
          isRead: false,
          createdAt: new Date("2026-01-03T12:00:00.000Z"),
        },
        {
          ...common,
          id: tieLowId,
          userId: owner.id,
          isRead: false,
          createdAt: tiedDate,
        },
        ...foreignIds.map((id) => ({
          ...common,
          id,
          userId: otherUser.id,
          isRead: false,
          createdAt: new Date("2026-01-04T12:00:00.000Z"),
        })),
      ],
    });
  });

  afterAll(async () => {
    try {
      if (prisma && userIds.length > 0) {
        const where = { userId: { in: userIds } };
        await prisma.notification.deleteMany({ where });
        await prisma.actionLog.deleteMany({ where });
        await prisma.userConnexionLog.deleteMany({ where });
        await prisma.userPermissionLog.deleteMany({ where });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    } finally {
      await app?.close();
    }
  });

  it("liste les deux états de lecture d'un visiteur sans permission supplémentaire", async () => {
    expect(owner.role).toBe(Roles.VISITOR);
    expect(owner.additionalPermissions).toEqual([]);

    const response = await list(ownerToken).expect(200);
    const body = response.body as NotificationPage;
    expect(body.total).toBe(5);
    expect(body.results.map(({ id }) => id)).toEqual(descendingIds);
    expect(body.results.map(({ isRead }) => isRead)).toEqual([
      false,
      false,
      true,
      false,
      true,
    ]);
  });

  it.each(["asc", "desc"] as const)(
    "pagine sans doublon ni omission à date égale en ordre %s",
    async (order) => {
      const expectedIds =
        order === "desc" ? descendingIds : [...descendingIds].reverse();
      const collectedIds: string[] = [];

      for (let page = 0; page < 4; page++) {
        const response = await list(ownerToken, {
          page,
          pageSize: 2,
          order,
        }).expect(200);
        const body = response.body as NotificationPage;
        const ids = body.results.map(({ id }) => id);
        expect(body.total).toBe(5);
        expect(ids).toEqual(expectedIds.slice(page * 2, page * 2 + 2));
        collectedIds.push(...ids);
      }

      expect(collectedIds).toEqual(expectedIds);
      expect(new Set(collectedIds).size).toBe(5);
    },
  );

  it.each([true, false])(
    "filtre isRead=%s avant de calculer le total et la pagination",
    async (isRead) => {
      const expectedIds = isRead ? readIds : unreadIds;
      const all = await list(ownerToken, {
        isRead,
        pageSize: 0,
      }).expect(200);
      const allBody = all.body as NotificationPage;
      expect(allBody.total).toBe(expectedIds.length);
      expect(allBody.results.map(({ id }) => id)).toEqual(expectedIds);
      expect(allBody.results.every((row) => row.isRead === isRead)).toBe(true);

      const paginated = await list(ownerToken, {
        isRead,
        page: 1,
        pageSize: 1,
      }).expect(200);
      const pageBody = paginated.body as NotificationPage;
      expect(pageBody.total).toBe(expectedIds.length);
      expect(pageBody.results.map(({ id }) => id)).toEqual([expectedIds[1]]);
    },
  );

  it.each([
    { page: 0.5, pageSize: 2 },
    { pageSize: 1.5 },
    { page: -1 },
    { pageSize: -1 },
    { pageSize: 101 },
    { page: "invalid" },
    { pageSize: "invalid" },
  ])("refuse les paramètres de pagination invalides %j", async (query) => {
    await list(ownerToken, query).expect(400);
  });

  it.each(["yes", "1", "0", "TRUE", "False", "null", "", " false "])(
    "refuse la valeur isRead invalide %j avec un 400",
    async (isRead) => {
      await list(ownerToken, { isRead }).expect(400);
    },
  );

  it("refuse un filtre isRead répété au lieu de choisir silencieusement une valeur", async () => {
    await request(app.getHttpServer())
      .get("/notifications?isRead=true&isRead=false")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(400);
  });

  it("compte toutes les notifications non lues du compte, indépendamment de la page", async () => {
    const page = await list(ownerToken, {
      isRead: false,
      pageSize: 1,
    }).expect(200);
    expect((page.body as NotificationPage).results).toHaveLength(1);
    await unreadCount(ownerToken).expect(200, { count: 3 });
    await unreadCount(otherToken).expect(200, { count: 2 });
  });

  it("marque individuellement une notification comme lue de manière idempotente", async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await request(app.getHttpServer())
        .patch(`/notifications/${newestId}/read`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(204);
      expect(response.text).toBe("");
      await unreadCount(ownerToken).expect(200, { count: 2 });
    }

    expect(
      await prisma.notification.findUniqueOrThrow({
        where: { id: newestId },
        select: { isRead: true },
      }),
    ).toEqual({ isRead: true });
    await unreadCount(otherToken).expect(200, { count: 2 });
  });

  it.each(["post", "patch"] as const)(
    "%s read-all marque uniquement ses propres notifications et reste idempotent",
    async (method) => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await request(app.getHttpServer())
          [method]("/notifications/read-all")
          .set("Authorization", `Bearer ${ownerToken}`)
          .expect(204);
        expect(response.text).toBe("");
        await unreadCount(ownerToken).expect(200, { count: 0 });
        await unreadCount(otherToken).expect(200, { count: 2 });
      }

      const response = await list(ownerToken, { isRead: true }).expect(200);
      expect((response.body as NotificationPage).total).toBe(5);
      expect(
        (response.body as NotificationPage).results.every(
          ({ isRead }) => isRead,
        ),
      ).toBe(true);
      await list(ownerToken, { isRead: false }).expect(200, {
        results: [],
        total: 0,
      });
    },
  );

  it("ne dévoile pas les notifications d'un autre utilisateur dans la liste", async () => {
    const response = await list(otherToken).expect(200);
    const body = response.body as NotificationPage;
    expect(body.total).toBe(2);
    expect(body.results.map(({ id }) => id).sort()).toEqual(
      [...foreignIds].sort(),
    );
  });

  it("refuse de marquer une notification étrangère ou absente sans modifier son propriétaire", async () => {
    for (const id of [foreignIds[0], randomUUID()]) {
      await request(app.getHttpServer())
        .patch(`/notifications/${id}/read`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(404);
    }
    await unreadCount(ownerToken).expect(200, { count: 3 });
    await unreadCount(otherToken).expect(200, { count: 2 });
  });

  it.each([
    ["get", "/notifications"],
    ["get", "/notifications/unread-count"],
    ["patch", `/notifications/${newestId}/read`],
    ["post", "/notifications/read-all"],
    ["patch", "/notifications/read-all"],
  ] as const)("refuse %s %s sans authentification", async (method, path) => {
    await request(app.getHttpServer())[method](path).expect(401);
    expect(
      await prisma.notification.count({
        where: { userId: owner.id, isRead: false },
      }),
    ).toBe(3);
  });

  it("documente la pagination, le filtre, les réponses et les endpoints de lecture dans OpenAPI", async () => {
    const response = await request(app.getHttpServer())
      .get("/swagger/json")
      .expect(200);
    const spec = response.body as OpenAPIObject;
    const findParameter = (name: string) =>
      spec.paths["/notifications"]?.get?.parameters?.find(
        (parameter) => !("$ref" in parameter) && parameter.name === name,
      );
    expect(findParameter("page")).toMatchObject({
      name: "page",
      in: "query",
      required: false,
      schema: { type: "integer", minimum: 0 },
    });
    expect(findParameter("pageSize")).toMatchObject({
      name: "pageSize",
      in: "query",
      required: false,
      schema: { type: "integer", minimum: 0, maximum: 100, default: 15 },
    });
    expect(findParameter("isRead")).toMatchObject({
      name: "isRead",
      in: "query",
      required: false,
      schema: { type: "boolean" },
    });
    expect(spec.paths["/notifications"]?.get?.responses["200"]).toMatchObject({
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/PaginatedNotificationDto" },
        },
      },
    });
    expect(
      spec.paths["/notifications/unread-count"]?.get?.responses["200"],
    ).toMatchObject({
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/UnreadCountDto" },
        },
      },
    });
    expect(spec.components?.schemas?.PaginatedNotificationDto).toMatchObject({
      properties: {
        results: {
          type: "array",
          items: { $ref: "#/components/schemas/NotificationDto" },
        },
        total: { type: "number" },
      },
    });
    expect(spec.components?.schemas?.NotificationDto).toMatchObject({
      properties: {
        id: { type: "string" },
        isRead: { type: "boolean" },
        createdAt: { type: "string", format: "date-time" },
      },
    });
    expect(spec.components?.schemas?.UnreadCountDto).toMatchObject({
      properties: { count: { type: "number" } },
    });
    expect(
      spec.paths["/notifications/{id}/read"]?.patch?.responses["204"],
    ).toBeDefined();
    for (const method of ["post", "patch"] as const) {
      expect(
        spec.paths["/notifications/read-all"]?.[method]?.responses["204"],
      ).toBeDefined();
    }
  });
});
