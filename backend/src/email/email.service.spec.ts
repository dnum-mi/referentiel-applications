import * as nodemailer from "nodemailer";
import { ReportStatus } from "@prisma/client";
import type { ConfigService } from "@nestjs/config";
import type { EmailTemplateService } from "./email-templates.services";
import type { EmailLogService } from "./email-log.service";
import type { LoggerService } from "src/logger/logger.service";
import { EmailService } from "./email.service";

jest.mock("nodemailer");

const sendMail = jest.fn();

(nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });

const makeService = (enabled: boolean) => {
  const configValues: Record<string, unknown> = {
    "email.host": "smtp.example.com",
    "email.port": 587,
    "email.secure": false,
    "email.from": "noreply@example.com",
    "email.enabled": enabled,
    BASE_URL: "http://localhost:5173",
  };
  const configService = {
    get: jest.fn((key: string, fallback?: unknown) => {
      const value = configValues[key];
      return value !== undefined ? value : fallback;
    }),
  } as unknown as ConfigService;

  const templateService = {
    render: jest.fn().mockReturnValue("<html></html>"),
    htmlToText: jest.fn().mockReturnValue("text"),
  } as unknown as EmailTemplateService;

  const log = jest
    .fn()
    .mockImplementation(({ wasSent }) =>
      Promise.resolve({ id: "email-log-1", wasSent }),
    );
  const emailLogService = { log } as unknown as EmailLogService;

  const logger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  } as unknown as LoggerService;

  const service = new EmailService(
    configService,
    templateService,
    emailLogService,
    logger,
  );

  return { service, emailLogService, logger };
};

describe("EmailService — #2411 e-mail journalisé même quand les envois sont désactivés", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("sendSignalementUpdateEmail", () => {
    const args = {
      recipientEmail: "declarant@example.com",
      description: "desc",
      status: ReportStatus.done,
      applicationName: "APP",
      notes: "notes",
    };

    it("journalise l'e-mail avec wasSent: false sans appeler le transporteur quand les emails sont désactivés", async () => {
      const { service, emailLogService } = makeService(false);

      const result = await service.sendSignalementUpdateEmail(args);

      expect(sendMail).not.toHaveBeenCalled();
      expect(emailLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ wasSent: false }),
      );
      expect(result).toEqual({ id: "email-log-1", wasSent: false });
    });

    it("envoie l'e-mail et le journalise avec wasSent: true quand les emails sont activés", async () => {
      sendMail.mockResolvedValueOnce(undefined);
      const { service, emailLogService } = makeService(true);

      const result = await service.sendSignalementUpdateEmail(args);

      expect(sendMail).toHaveBeenCalled();
      expect(emailLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ wasSent: true }),
      );
      expect(result).toEqual({ id: "email-log-1", wasSent: true });
    });

    it("retourne null sans propager d'erreur quand l'envoi échoue réellement", async () => {
      sendMail.mockRejectedValueOnce(new Error("SMTP down"));
      const { service, logger, emailLogService } = makeService(true);

      await expect(
        service.sendSignalementUpdateEmail(args),
      ).resolves.toBeNull();
      expect(logger.warn).toHaveBeenCalled();
      expect(emailLogService.log).not.toHaveBeenCalled();
    });
  });

  // Verrou de non-régression : `deliver()` (le point de passage commun à toutes les méthodes
  // d'envoi) journalise toujours l'e-mail, même désactivé — c'est ce qui garantit que son contenu
  // reste consultable depuis la notification in-app et depuis l'historique admin des e-mails,
  // même quand SMTP est coupé.
  it("sendActorAddedNotification journalise l'e-mail avec wasSent: false sans l'envoyer quand désactivé", async () => {
    const { service, emailLogService } = makeService(false);

    const result = await service.sendActorAddedNotification(
      "actor@example.com",
      "Jean Dupont",
      "Une application",
    );

    expect(sendMail).not.toHaveBeenCalled();
    expect(emailLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({ wasSent: false }),
    );
    expect(result).toEqual({ id: "email-log-1", wasSent: false });
  });

  it("sendActorAddedNotification retourne null sans journaliser quand le destinataire est vide", async () => {
    const { service, emailLogService } = makeService(true);

    const result = await service.sendActorAddedNotification("", "Jean Dupont");

    expect(sendMail).not.toHaveBeenCalled();
    expect(emailLogService.log).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
