import { Roles } from "@prisma/client";
import request from "supertest";
import { ApplicationFaker } from "./fakers/application.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

// #2542 : avant le correctif, `ReportHistory.report` n'avait pas de règle `onDelete` (Restrict
// implicite) — la cascade Application → Report était bloquée et la suppression d'une fiche
// portant un signalement historisé échouait en 500.
describe("DELETE /applications/:id — signalement avec historique (#2542)", () => {
  const app = setupTestSuite();

  it("supprime la fiche, son signalement et l'historique de celui-ci", async () => {
    const admin = await UserFaker.create({ role: Roles.ADMIN });
    const token = getToken(admin);
    const application = await ApplicationFaker.create(admin);
    const prisma = getPrismaClient();

    const report = await prisma.report.create({
      data: {
        applicationId: application.id,
        notifierId: admin.id,
        description: "Signalement suivi d'un changement de statut",
        status: "in_progress",
        history: {
          create: [
            { action: "created", status: "in_pending" },
            { action: "status_changed", status: "in_progress" },
          ],
        },
      },
    });
    expect(
      await prisma.reportHistory.count({ where: { reportId: report.id } }),
    ).toBe(2);

    await request(app().getHttpServer())
      .delete(`/applications/${application.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    await request(app().getHttpServer())
      .get(`/applications/${application.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    expect(
      await prisma.report.findUnique({ where: { id: report.id } }),
    ).toBeNull();
    expect(
      await prisma.reportHistory.count({ where: { reportId: report.id } }),
    ).toBe(0);
    expect(
      await prisma.metadata.count({ where: { applicationId: application.id } }),
    ).toBe(0);
  });
});
