import { randomUUID } from "node:crypto";
import { Permission, Roles } from "@prisma/client";
import request from "supertest";
import { ActorTypeFaker } from "./fakers/actor-type.faker";
import { getPrismaClient } from "./fakers/prisma";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("Priorité de redémarrage — capacité et valeur vide (#3260)", () => {
  const app = setupTestSuite();
  const prefix = `priority-${randomUUID()}`;
  const prisma = getPrismaClient();

  async function user(role: Roles, granted = false) {
    return prisma.user.create({
      data: {
        email: `${prefix}-${randomUUID()}@example.test`,
        role,
        additionalPermissions: granted ? [Permission.AppWritePriority] : [],
      },
    });
  }

  async function application() {
    return prisma.application.create({
      data: {
        label: `${prefix}-${randomUUID()}`,
        description: "Priorité",
        priorityRestart: "R1",
        quality: 0,
      },
    });
  }

  it.each([Roles.CONTRIBUTOR, Roles.ADMIN])(
    "%s ne renseigne la priorité initiale qu'avec la capacité",
    async (role) => {
      for (const granted of [false, true]) {
        const principal = await user(role, granted);
        const response = await request(app().getHttpServer())
          .post("/applications")
          .set("Authorization", `Bearer ${getToken(principal)}`)
          .send({
            label: `${prefix}-${randomUUID()}`,
            description: "Priorité",
            tags: [],
            status: { status: "to_validate" },
            priorityRestart: "R0",
          })
          .expect(201);
        const saved = await prisma.application.findUniqueOrThrow({
          where: { id: response.body.id },
        });
        expect(saved.priorityRestart).toBe(granted ? "R0" : null);
      }
    },
  );

  it.each([Roles.CONTRIBUTOR, Roles.ADMIN])(
    "%s sans capacité ne peut ni changer ni effacer la priorité",
    async (role) => {
      const principal = await user(role);
      const target = await application();
      for (const priorityRestart of ["R3", null]) {
        await request(app().getHttpServer())
          .patch(`/applications/${target.id}`)
          .set("Authorization", `Bearer ${getToken(principal)}`)
          .send({ priorityRestart })
          .expect(200);
        expect(
          (
            await prisma.application.findUniqueOrThrow({
              where: { id: target.id },
            })
          ).priorityRestart,
        ).toBe("R1");
      }
    },
  );

  it("une capacité individuelle permet d’effacer et de rétablir la priorité sans modifier les autres champs", async () => {
    const principal = await user(Roles.READER, true);
    const target = await application();
    for (const priorityRestart of [null, "R2"]) {
      await request(app().getHttpServer())
        .patch(`/applications/${target.id}`)
        .set("Authorization", `Bearer ${getToken(principal)}`)
        .send({ priorityRestart, label: "Interdit" })
        .expect(200);
      const response = await request(app().getHttpServer())
        .get(`/applications/${target.id}`)
        .set("Authorization", `Bearer ${getToken(principal)}`)
        .expect(200);
      expect(response.body.priorityRestart).toBe(priorityRestart);
      expect(response.body.label).toBe(target.label);
    }
    await request(app().getHttpServer())
      .patch(`/applications/${target.id}`)
      .set("Authorization", `Bearer ${getToken(principal)}`)
      .send({})
      .expect(200);
    expect(
      (await prisma.application.findUniqueOrThrow({ where: { id: target.id } }))
        .priorityRestart,
    ).toBe("R2");
    await request(app().getHttpServer())
      .patch(`/applications/${target.id}`)
      .set("Authorization", `Bearer ${getToken(principal)}`)
      .send({ priorityRestart: "UNSET" })
      .expect(400);
  });

  it("ignore une ancienne attribution par type d’acteur", async () => {
    const principal = await user(Roles.VISITOR);
    const target = await application();
    const actorType = await ActorTypeFaker.create([
      Permission.AppWritePriority,
    ]);
    await prisma.actor.create({
      data: {
        applicationId: target.id,
        actorTypeId: actorType.id,
        email: principal.email,
      },
    });
    await request(app().getHttpServer())
      .patch(`/applications/${target.id}`)
      .set("Authorization", `Bearer ${getToken(principal)}`)
      .send({ priorityRestart: null })
      .expect(403);
    expect(
      (await prisma.application.findUniqueOrThrow({ where: { id: target.id } }))
        .priorityRestart,
    ).toBe("R1");
    const other = await application();
    await request(app().getHttpServer())
      .patch(`/applications/${other.id}`)
      .set("Authorization", `Bearer ${getToken(principal)}`)
      .send({ priorityRestart: null })
      .expect(403);
  });

  it("ne propose plus la capacité dans l’API de matrice et refuse son écriture", async () => {
    const admin = await user(Roles.ADMIN);
    const actorType = await ActorTypeFaker.create([
      Permission.AppWritePriority,
    ]);
    const response = await request(app().getHttpServer())
      .get("/actorTypes/perms-matrix")
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .expect(200);
    const row = response.body.find(
      (entry: { actorTypeId: string }) => entry.actorTypeId === actorType.id,
    );
    expect(row).toBeDefined();
    expect(row).not.toHaveProperty("AppWritePriority");
    await request(app().getHttpServer())
      .patch("/actorTypes/perms-matrix")
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .send([{ ...row, AppWritePriority: true }])
      .expect(400);
    await request(app().getHttpServer())
      .patch("/actorTypes/perms-matrix")
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .send([{ ...row, AppWrite: true }])
      .expect(200);
  });
});
