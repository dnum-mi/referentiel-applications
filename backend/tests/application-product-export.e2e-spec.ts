import JSZip from "jszip";
import {
  MetadataAction,
  Permission,
  Roles,
  type ActionLog,
} from "@prisma/client";
import request from "supertest";
import { POWERPOINT_CONTENT_TYPE } from "src/applications/product-powerpoint";
import { ApplicationValidationCronService } from "src/email/cron/application-validation-cron.service";
import { EmailDigestCronService } from "src/email/cron/email-cron.service";
import { EmailService } from "src/email/email.service";
import { ActorFaker } from "./fakers/actor.faker";
import { ApplicationFaker } from "./fakers/application.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("POST /applications/:applicationId/export/powerpoint (#434)", () => {
  const app = setupTestSuite();
  let applicationId: string;
  let userId: string;
  let token: string;
  let subscriberId: string;

  beforeAll(async () => {
    const user = await UserFaker.create({
      role: Roles.VISITOR,
      additionalPermissions: [Permission.MetadataRead],
    });
    userId = user.id;
    token = getToken(user);
    const application = await ApplicationFaker.create(user);
    applicationId = application.id;
    const subscriber = await UserFaker.create();
    subscriberId = subscriber.id;
    await getPrismaClient().application.update({
      where: { id: applicationId },
      data: {
        label: "Fiche produit à exporter",
        subscribers: { connect: { id: subscriberId } },
        technicalDebtInfo: {
          create: { technicalMaturity: 2.5, costContainment: 3.5 },
        },
      },
    });
  });

  it("permet l'export à un visiteur et trace utilisateur, fiche et date", async () => {
    const initialDates = await request(app().getHttpServer())
      .get(`/applications/${applicationId}/metadatas/first-last`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const response = await request(app().getHttpServer())
      .post(`/applications/${applicationId}/export/powerpoint`)
      .set("Authorization", `Bearer ${token}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(response.headers["content-type"]).toContain(POWERPOINT_CONTENT_TYPE);
    expect(response.headers["content-disposition"]).toContain(
      `fiche-produit-${applicationId}.pptx`,
    );
    expect(response.headers["cache-control"]).toBe("no-store");
    const zip = await JSZip.loadAsync(response.body as Buffer);
    const slide = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(slide).toContain("Fiche produit à exporter");
    expect(slide).not.toMatch(
      /technicalMaturity|costContainment|Dette technique/,
    );

    const prisma = getPrismaClient();
    const metadata = await prisma.metadata.findFirst({
      where: {
        applicationId,
        createdById: userId,
        action: MetadataAction.export,
      },
    });
    expect(metadata).not.toBeNull();
    expect(metadata!.createdAt).toBeInstanceOf(Date);
    expect(metadata!.description).toContain("PowerPoint");
    expect(
      await prisma.notification.count({
        where: { applicationId, userId: subscriberId },
      }),
    ).toBe(0);
    const datesAfterExport = await request(app().getHttpServer())
      .get(`/applications/${applicationId}/metadatas/first-last`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(datesAfterExport.body).toEqual(initialDates.body);

    // Le journal central est écrit après la réponse, sur l'évènement finish.
    let action: ActionLog | null = null;
    for (let attempt = 0; attempt < 20 && !action; attempt++) {
      action = await prisma.actionLog.findFirst({
        where: {
          userId,
          path: `/applications/${applicationId}/export/powerpoint`,
          method: "POST",
          statusCode: 200,
        },
      });
      if (!action) await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(action).not.toBeNull();
  });

  it("refuse l'export sans authentification", async () => {
    await request(app().getHttpServer())
      .post(`/applications/${applicationId}/export/powerpoint`)
      .expect(401);
  });

  it("exclut le téléchargement du digest et conserve la relance d'une fiche ancienne", async () => {
    const prisma = getPrismaClient();
    const lastChangedAt = new Date();
    lastChangedAt.setMonth(lastChangedAt.getMonth() - 8);
    await prisma.metadata.updateMany({
      where: { applicationId, action: { not: MetadataAction.export } },
      data: { createdAt: lastChangedAt },
    });
    await prisma.user.update({
      where: { id: subscriberId },
      data: { emailNotificationsEnabled: true },
    });
    const actorType = await prisma.actorType.upsert({
      where: { code: "MOA" },
      update: {},
      create: {
        code: "MOA",
        label: "Maîtrise d'ouvrage",
        description: "Responsable métier",
      },
    });
    await ActorFaker.link({
      userEmail: "responsable-export-434@example.test",
      actorTypeId: actorType.id,
      applicationId,
    });
    await request(app().getHttpServer())
      .post(`/applications/${applicationId}/export/powerpoint`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const emailService = app().get(EmailService);
    const digest = jest
      .spyOn(emailService, "sendDailyDigestNotification")
      .mockResolvedValue(undefined);
    const reminder = jest
      .spyOn(emailService, "sendApplicationValidationReminderEmail")
      .mockResolvedValue(null);
    try {
      // Les sélections Prisma et les traitements sont réels ; seuls les
      // envois d'emails sont neutralisés pour ne contacter aucun destinataire.
      await app().get(EmailDigestCronService).sendDailyDigest(new Date());
      const digestedApplications = digest.mock.calls.flatMap(
        ([, applications]) =>
          applications.map((application) => application.applicationId),
      );
      expect(digestedApplications).not.toContain(applicationId);
      await app()
        .get(ApplicationValidationCronService)
        .sendValidationReminders();
      expect(reminder).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId,
          lastModifiedDate: lastChangedAt,
        }),
      );
    } finally {
      digest.mockRestore();
      reminder.mockRestore();
    }
  });

  it("renvoie 404 pour une application absente sans enregistrer d'export", async () => {
    await request(app().getHttpServer())
      .post(
        "/applications/00000000-0000-0000-0000-000000000000/export/powerpoint",
      )
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
    expect(
      await getPrismaClient().metadata.count({
        where: {
          applicationId: "00000000-0000-0000-0000-000000000000",
          action: MetadataAction.export,
        },
      }),
    ).toBe(0);
  });
});
