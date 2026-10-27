import type { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { NotificationType, Roles } from "@prisma/client";
import request from "supertest";
import { getPrismaClient } from "./fakers/prisma";
import { getToken } from "./getToken";
import { setupApp } from "./setup";

describe("Acteurs — type obligatoire dans un PATCH et acteurs historiques sans type (#2934)", () => {
  const prisma = getPrismaClient();
  const prefix = `actor-type-update-${randomUUID()}`;
  const actorTypeIds: string[] = [];
  const applicationIds: string[] = [];
  const userIds: string[] = [];
  let app: INestApplication;
  let adminToken: string;
  let applicationId: string;
  let otherApplicationId: string;
  let recipientId: string;
  let recipientEmail: string;

  async function createActorType(label: string) {
    const actorType = await prisma.actorType.create({
      data: { code: randomUUID().slice(0, 12), label },
    });
    actorTypeIds.push(actorType.id);
    return actorType;
  }

  async function createActor(
    actorTypeId: string | null,
    email = recipientEmail,
  ) {
    return prisma.actor.create({
      data: {
        applicationId,
        actorTypeId,
        email,
        firstname: "Prénom initial",
        lastname: "Nom initial",
        isGroup: false,
      },
    });
  }

  async function snapshot(actorIds: string[]) {
    const [actors, metadatas, notifications] = await Promise.all([
      prisma.actor.findMany({
        where: { id: { in: actorIds } },
        orderBy: { id: "asc" },
      }),
      prisma.metadata.findMany({
        where: { actorId: { in: actorIds } },
        orderBy: { id: "asc" },
      }),
      prisma.notification.findMany({
        where: { applicationId },
        orderBy: { id: "asc" },
      }),
    ]);
    return { actors, metadatas, notifications };
  }

  function patchActor(actorId: string, body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .patch(`/applications/${applicationId}/actors/${actorId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(body);
  }

  beforeAll(async () => {
    app = await setupApp();
    const admin = await prisma.user.create({
      data: {
        email: `${prefix}-admin@example.test`,
        role: Roles.ADMIN,
        emailNotificationsEnabled: false,
      },
    });
    userIds.push(admin.id);
    adminToken = getToken(admin);
    const recipient = await prisma.user.create({
      data: {
        email: `${prefix}-recipient@example.test`,
        role: Roles.READER,
        emailNotificationsEnabled: false,
      },
    });
    userIds.push(recipient.id);
    recipientId = recipient.id;
    recipientEmail = recipient.email;

    for (const suffix of ["principale", "autre"]) {
      const application = await prisma.application.create({
        data: {
          label: `${prefix}-${suffix}`,
          description: "Fixture de validation des mises à jour d'acteur",
          quality: 100,
        },
      });
      applicationIds.push(application.id);
    }
    [applicationId, otherApplicationId] = applicationIds;
  });

  afterAll(async () => {
    try {
      await prisma.application.deleteMany({
        where: { id: { in: applicationIds } },
      });
      await prisma.actorType.deleteMany({
        where: { id: { in: actorTypeIds } },
      });
      await prisma.userConnexionLog.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.actionLog.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    } finally {
      if (app) await app.close();
      await prisma.$disconnect();
    }
  });

  it.each(["application", "administration"] as const)(
    "refuse actorTypeId:null par la route %s avant toute modification ou historique",
    async (route) => {
      const actorType = await createActorType(`Type ${route}`);
      const actor = await createActor(actorType.id);
      const before = await snapshot([actor.id]);
      const path =
        route === "application"
          ? `/applications/${applicationId}/actors/${actor.id}`
          : `/actors/${actor.id}`;

      const response = await request(app.getHttpServer())
        .patch(path)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ actorTypeId: null, firstname: "Ne doit pas être enregistré" });

      expect({
        status: response.status,
        ...(await snapshot([actor.id])),
      }).toEqual({
        status: 400,
        ...before,
      });
      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining("actorTypeId")]),
      );
    },
  );

  it("refuse le détachement en masse avant de modifier le premier acteur", async () => {
    const actorType = await createActorType("Type bulk");
    const email = `${prefix}-bulk@example.test`;
    const first = await createActor(actorType.id, email);
    const second = await createActor(actorType.id, email);
    const actorIds = [first.id, second.id];
    const before = await snapshot(actorIds);

    const response = await request(app.getHttpServer())
      .patch("/actors/by-email")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        targetEmail: email,
        applicationIds: [applicationId],
        actorTypeId: null,
        lastname: "Ne doit pas être enregistré",
      });

    expect({ status: response.status, ...(await snapshot(actorIds)) }).toEqual({
      status: 400,
      ...before,
    });
  });

  it("conserve le type quand un PATCH modifie seulement un autre champ", async () => {
    const actorType = await createActorType("Type conservé");
    const actor = await createActor(actorType.id);

    const response = await patchActor(actor.id, {
      lastname: "Nom corrigé",
    }).expect(200);

    expect(response.body).toMatchObject({
      id: actor.id,
      actorTypeId: actorType.id,
      lastname: "Nom corrigé",
    });
    expect(
      await prisma.actor.findUniqueOrThrow({ where: { id: actor.id } }),
    ).toMatchObject({ actorTypeId: actorType.id, lastname: "Nom corrigé" });
    expect(await prisma.metadata.count({ where: { actorId: actor.id } })).toBe(
      1,
    );
  });

  it("accepte une réaffectation vers un type valide", async () => {
    const initialType = await createActorType("Ancien type");
    const nextType = await createActorType("Nouveau type");
    const actor = await createActor(initialType.id);

    const response = await patchActor(actor.id, {
      actorTypeId: nextType.id,
    }).expect(200);

    expect(response.body).toMatchObject({
      id: actor.id,
      actorTypeId: nextType.id,
      actorType: { id: nextType.id },
    });
    expect(
      await prisma.actor.findUniqueOrThrow({ where: { id: actor.id } }),
    ).toMatchObject({ actorTypeId: nextType.id });
  });

  it("édite un acteur historique sans type et notifie les champs réellement modifiés", async () => {
    const actor = await createActor(null);
    const before = await snapshot([actor.id]);

    const response = await patchActor(actor.id, {
      firstname: "Prénom corrigé",
    }).expect(200);

    expect(response.body).toMatchObject({
      id: actor.id,
      actorTypeId: null,
      firstname: "Prénom corrigé",
    });
    expect(
      await prisma.actor.findUniqueOrThrow({ where: { id: actor.id } }),
    ).toMatchObject({ actorTypeId: null, firstname: "Prénom corrigé" });
    expect(await prisma.metadata.count({ where: { actorId: actor.id } })).toBe(
      1,
    );
    const after = await snapshot([actor.id]);
    const notifications = after.notifications.filter(
      (notification) =>
        notification.userId === recipientId &&
        !before.notifications.some(
          (previous) => previous.id === notification.id,
        ),
    );
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      type: NotificationType.actor_modified,
      message: expect.stringContaining("Prénom"),
    });
    expect(notifications[0].message).not.toContain("Type d'acteur");
  });

  it("réaffecte un type à un acteur historique et annonce le changement de type", async () => {
    const actor = await createActor(null);
    const nextType = await createActorType("Type retrouvé");
    const before = await snapshot([actor.id]);

    const response = await patchActor(actor.id, {
      actorTypeId: nextType.id,
    }).expect(200);

    expect(response.body).toMatchObject({
      id: actor.id,
      actorTypeId: nextType.id,
    });
    expect(
      await prisma.actor.findUniqueOrThrow({ where: { id: actor.id } }),
    ).toMatchObject({ actorTypeId: nextType.id });
    const after = await snapshot([actor.id]);
    expect(after.metadatas).toHaveLength(1);
    const notifications = after.notifications.filter(
      (notification) =>
        notification.userId === recipientId &&
        !before.notifications.some(
          (previous) => previous.id === notification.id,
        ),
    );
    expect(notifications).toHaveLength(1);
    expect(notifications[0].message).toContain("Type d'acteur");
  });

  it("conserve le refus de modifier l'acteur d'une autre application", async () => {
    const actorType = await createActorType("Type périmètre");
    const actor = await createActor(actorType.id);
    const before = await snapshot([actor.id]);

    await request(app.getHttpServer())
      .patch(`/applications/${otherApplicationId}/actors/${actor.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ firstname: "Autre application" })
      .expect(404);

    expect(await snapshot([actor.id])).toEqual(before);
  });
});
