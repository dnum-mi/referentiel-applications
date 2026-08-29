import { NotificationType, ReportStatus } from "@prisma/client";
import type { EmailService } from "src/email/email.service";
import type { NotificationService } from "src/notification/notification.service";
import { UserNotificationService } from "./user-notification.service";

const report = {
  id: "report-1",
  status: ReportStatus.done,
  description: "desc",
  notes: "notes",
  applicationId: "app-1",
  notifierId: "notifier-1",
  notifier: { id: "notifier-1", email: "declarant@example.com" },
  application: { shortName: "APP", label: "Application" },
};

const makeService = () => {
  const sendSignalementUpdateEmail = jest.fn();
  const create = jest.fn().mockResolvedValue(undefined);
  const service = new UserNotificationService(
    { sendSignalementUpdateEmail } as unknown as EmailService,
    { create } as unknown as NotificationService,
  );
  return { service, sendSignalementUpdateEmail, create };
};

describe("UserNotificationService — notification de changement de statut (#2377)", () => {
  it("lie l'emailLog à la notification quand l'email réussit", async () => {
    const { service, sendSignalementUpdateEmail, create } = makeService();
    sendSignalementUpdateEmail.mockResolvedValue({ id: "email-log-1" });

    await service.notifyUserOnStatusChange(true, report as never);

    expect(create).toHaveBeenCalledWith(
      "notifier-1",
      NotificationType.report_status_changed,
      expect.any(String),
      expect.objectContaining({ emailLogId: "email-log-1" }),
    );
  });

  // Cœur du correctif : SMTP indisponible ne doit ni propager d'erreur (500 à l'admin, mise à jour
  // du statut cassée), ni empêcher la notification in-app — seul canal qui prévient le déclarant.
  it("crée quand même la notification in-app quand l'email échoue, sans propager l'erreur", async () => {
    const { service, sendSignalementUpdateEmail, create } = makeService();
    sendSignalementUpdateEmail.mockRejectedValue(new Error("SMTP down"));

    await expect(
      service.notifyUserOnStatusChange(true, report as never),
    ).resolves.toBeUndefined();

    expect(create).toHaveBeenCalledWith(
      "notifier-1",
      NotificationType.report_status_changed,
      expect.any(String),
      expect.objectContaining({ emailLogId: undefined }),
    );
  });

  it("ne notifie pas quand le statut ne l'exige pas", async () => {
    const { service, sendSignalementUpdateEmail, create } = makeService();

    await service.notifyUserOnStatusChange(true, {
      ...report,
      status: ReportStatus.in_pending,
    } as never);

    expect(sendSignalementUpdateEmail).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
