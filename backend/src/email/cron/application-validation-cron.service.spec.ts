import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { Status } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { ApplicationValidationCronService } from "./application-validation-cron.service";
import { EmailService } from "../email.service";
import { NotificationService } from "src/notification/notification.service";
import { PrismaService } from "src/prisma/prisma.service";
import { LoggerService } from "src/logger/logger.service";

describe("ApplicationValidationCronService", () => {
  let service: ApplicationValidationCronService;

  const mockPrismaService = {
    application: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    notificationLog: {
      create: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  const mockEmailService = {
    sendApplicationValidationReminderEmail: jest.fn(),
  };

  const mockNotificationService = {
    createForUsers: jest.fn(),
    create: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationValidationCronService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ApplicationValidationCronService>(
      ApplicationValidationCronService,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("cron schedule", () => {
    it("should have the cron configured at 09:30 with Europe/Paris timezone", () => {
      const cronMetadata = Reflect.getMetadata(
        "SCHEDULE_CRON_OPTIONS",
        ApplicationValidationCronService.prototype.handleMonthlyCron,
      );
      expect(cronMetadata).toBeDefined();
      expect(cronMetadata.cronTime).toBe("30 9 1 * *");
      expect(cronMetadata.timeZone).toBe("Europe/Paris");
    });
  });

  describe("sendValidationReminders", () => {
    it("should use OR condition to include applications with null currentStatusId", async () => {
      mockPrismaService.application.count.mockResolvedValue(0);
      mockPrismaService.application.findMany.mockResolvedValue([]);

      await service.sendValidationReminders();

      expect(mockPrismaService.application.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ currentStatusId: null }),
            ]),
          }),
        }),
      );
    });

    it("should filter applications with no metadata update in the last 6 months", async () => {
      const currentDate = new Date("2025-01-01T09:30:00.000Z");
      jest.useFakeTimers({ now: currentDate });

      mockPrismaService.application.count.mockResolvedValue(1);
      mockPrismaService.application.findMany.mockResolvedValue([]);

      await service.sendValidationReminders();

      const findManyCallArgs =
        mockPrismaService.application.findMany.mock.calls[0][0];
      const sixMonthsThresholdDate = new Date("2024-07-01T09:30:00.000Z");

      expect(findManyCallArgs.where.metadatas).toEqual({
        none: {
          createdAt: { gte: expect.any(Date) },
        },
      });

      const actualThresholdDate =
        findManyCallArgs.where.metadatas.none.createdAt.gte;
      expect(actualThresholdDate.getMonth()).toBe(
        sixMonthsThresholdDate.getMonth(),
      );
      expect(actualThresholdDate.getFullYear()).toBe(
        sixMonthsThresholdDate.getFullYear(),
      );

      jest.useRealTimers();
    });

    it("should skip application that was recently notified", async () => {
      const staleApplicationWithRecentNotification = {
        id: "app-001",
        label: "Application Alpha",
        metadatas: [],
        actors: [{ email: "manager@example.com" }],
        notificationLogs: [{ id: "log-001" }],
      };

      mockPrismaService.application.count.mockResolvedValue(1);
      mockPrismaService.application.findMany.mockResolvedValue([
        staleApplicationWithRecentNotification,
      ]);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.sendValidationReminders();

      expect(
        mockEmailService.sendApplicationValidationReminderEmail,
      ).not.toHaveBeenCalled();
      expect(mockPrismaService.notificationLog.create).not.toHaveBeenCalled();
    });

    it("should skip application with no responsible actors", async () => {
      const staleApplicationWithNoActors = {
        id: "app-002",
        label: "Application Beta",
        metadatas: [],
        actors: [],
        notificationLogs: [],
      };

      mockPrismaService.application.count.mockResolvedValue(1);
      mockPrismaService.application.findMany.mockResolvedValue([
        staleApplicationWithNoActors,
      ]);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.sendValidationReminders();

      expect(
        mockEmailService.sendApplicationValidationReminderEmail,
      ).not.toHaveBeenCalled();
      expect(mockPrismaService.notificationLog.create).not.toHaveBeenCalled();
    });

    it("should send reminder emails and create notification log for stale applications", async () => {
      const lastMetadataDate = new Date("2024-01-01T00:00:00.000Z");
      const staleApplicationWithActors = {
        id: "app-003",
        label: "Application Gamma",
        metadatas: [{ createdAt: lastMetadataDate }],
        actors: [
          { email: "owner@example.com" },
          { email: "manager@example.com" },
        ],
        notificationLogs: [],
      };

      mockPrismaService.application.count.mockResolvedValue(1);
      mockPrismaService.application.findMany.mockResolvedValue([
        staleApplicationWithActors,
      ]);
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockEmailService.sendApplicationValidationReminderEmail.mockResolvedValue(
        { id: "email-log-gamma" },
      );
      mockPrismaService.notificationLog.create.mockResolvedValue({});

      await service.sendValidationReminders();

      expect(
        mockEmailService.sendApplicationValidationReminderEmail,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockEmailService.sendApplicationValidationReminderEmail,
      ).toHaveBeenCalledWith({
        recipientEmail: "owner@example.com",
        applicationId: "app-003",
        applicationLabel: "Application Gamma",
        lastModifiedDate: lastMetadataDate,
      });
      expect(mockPrismaService.notificationLog.create).toHaveBeenCalledWith({
        data: {
          applicationId: "app-003",
          type: "application_validation_reminder",
        },
      });
    });

    it("should deduplicate recipient emails before sending", async () => {
      const staleApplicationWithDuplicateActors = {
        id: "app-004",
        label: "Application Delta",
        metadatas: [],
        actors: [
          { email: "owner@example.com" },
          { email: "owner@example.com" },
        ],
        notificationLogs: [],
      };

      mockPrismaService.application.count.mockResolvedValue(1);
      mockPrismaService.application.findMany.mockResolvedValue([
        staleApplicationWithDuplicateActors,
      ]);
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockEmailService.sendApplicationValidationReminderEmail.mockResolvedValue(
        undefined,
      );
      mockPrismaService.notificationLog.create.mockResolvedValue({});

      await service.sendValidationReminders();

      expect(
        mockEmailService.sendApplicationValidationReminderEmail,
      ).toHaveBeenCalledTimes(1);
    });

    it("should skip actors whose email notifications are disabled", async () => {
      const staleApplicationWithOptedOutUser = {
        id: "app-005",
        label: "Application Epsilon",
        metadatas: [],
        actors: [{ email: "opted-out@example.com" }],
        notificationLogs: [],
      };

      mockPrismaService.application.count.mockResolvedValue(1);
      mockPrismaService.application.findMany.mockResolvedValue([
        staleApplicationWithOptedOutUser,
      ]);
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: "u1",
          email: "opted-out@example.com",
          emailNotificationsEnabled: false,
        },
      ]);

      await service.sendValidationReminders();

      expect(
        mockEmailService.sendApplicationValidationReminderEmail,
      ).not.toHaveBeenCalled();
    });

    it("respecte l'opt-out même si la casse de l'email diffère (#2381)", async () => {
      const staleApplication = {
        id: "app-006",
        label: "Application Zeta",
        metadatas: [],
        actors: [{ email: "Jean.Dupont@example.com" }],
        notificationLogs: [],
      };

      mockPrismaService.application.count.mockResolvedValue(1);
      mockPrismaService.application.findMany.mockResolvedValue([
        staleApplication,
      ]);
      // Compte enregistré en minuscules, opt-out actif.
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: "u2",
          email: "jean.dupont@example.com",
          emailNotificationsEnabled: false,
        },
      ]);

      await service.sendValidationReminders();

      expect(
        mockEmailService.sendApplicationValidationReminderEmail,
      ).not.toHaveBeenCalled();
    });

    it("should exclude decommissioned and deleted applications via OR condition", async () => {
      mockPrismaService.application.count.mockResolvedValue(0);
      mockPrismaService.application.findMany.mockResolvedValue([]);

      await service.sendValidationReminders();

      const findManyCallArgs =
        mockPrismaService.application.findMany.mock.calls[0][0];
      const orConditions = findManyCallArgs.where.OR;

      const statusCondition = orConditions.find(
        (condition: Record<string, unknown>) => condition.currentStatus,
      );
      expect(statusCondition).toBeDefined();
      expect(statusCondition.currentStatus.status.notIn).toContain(
        Status.decommissioned,
      );
      expect(statusCondition.currentStatus.status.notIn).toContain(
        Status.deleted,
      );
    });

    it("links each in-app notification to the e-mail sent to the same recipient (#2280 — suite)", async () => {
      const staleApplicationWithActors = {
        id: "app-007",
        label: "Application Eta",
        metadatas: [],
        actors: [
          { email: "owner@example.com" },
          { email: "opted-out@example.com" },
        ],
        notificationLogs: [],
      };

      mockPrismaService.application.count.mockResolvedValue(1);
      mockPrismaService.application.findMany.mockResolvedValue([
        staleApplicationWithActors,
      ]);
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: "user-owner",
          email: "owner@example.com",
          emailNotificationsEnabled: true,
        },
        {
          id: "user-opted-out",
          email: "opted-out@example.com",
          emailNotificationsEnabled: false,
        },
      ]);
      mockEmailService.sendApplicationValidationReminderEmail.mockResolvedValue(
        { id: "email-log-1", to: "owner@example.com" },
      );
      mockPrismaService.notificationLog.create.mockResolvedValue({});

      await service.sendValidationReminders();

      expect(mockNotificationService.create).toHaveBeenCalledWith(
        "user-owner",
        "application_validation_reminder",
        expect.any(String),
        expect.objectContaining({ emailLogId: "email-log-1" }),
      );
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        "user-opted-out",
        "application_validation_reminder",
        expect.any(String),
        expect.objectContaining({ emailLogId: undefined }),
      );
    });

    it("ne pose pas l'anti-spam quand tous les envois email échouent (#2378 bug 1)", async () => {
      const staleApplication = {
        id: "app-008",
        label: "Application Theta",
        metadatas: [],
        actors: [{ email: "owner@example.com" }],
        notificationLogs: [],
      };

      mockPrismaService.application.count.mockResolvedValue(1);
      mockPrismaService.application.findMany.mockResolvedValue([
        staleApplication,
      ]);
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: "u-owner",
          email: "owner@example.com",
          emailNotificationsEnabled: true,
        },
      ]);
      // SMTP en panne : chaque envoi rejette (avalé par le try/catch par destinataire).
      mockEmailService.sendApplicationValidationReminderEmail.mockRejectedValue(
        new Error("SMTP down"),
      );

      await service.sendValidationReminders();

      // Aucun canal n'a abouti : ni anti-spam, ni notification in-app (renvoi complet au prochain
      // passage sans doublon).
      expect(mockPrismaService.notificationLog.create).not.toHaveBeenCalled();
      expect(mockNotificationService.create).not.toHaveBeenCalled();
    });

    it("pose l'anti-spam quand seule une notification in-app est créée (tous opt-out) (#2378 bug 2)", async () => {
      const staleApplication = {
        id: "app-009",
        label: "Application Iota",
        metadatas: [],
        actors: [{ email: "owner@example.com" }],
        notificationLogs: [],
      };

      mockPrismaService.application.count.mockResolvedValue(1);
      mockPrismaService.application.findMany.mockResolvedValue([
        staleApplication,
      ]);
      // L'unique acteur a un compte avec les emails désactivés → aucun email à envoyer.
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: "u-owner",
          email: "owner@example.com",
          emailNotificationsEnabled: false,
        },
      ]);
      mockPrismaService.notificationLog.create.mockResolvedValue({});

      await service.sendValidationReminders();

      expect(
        mockEmailService.sendApplicationValidationReminderEmail,
      ).not.toHaveBeenCalled();
      // Notification in-app créée UNE fois + anti-spam posé pour éviter les doublons au redémarrage.
      expect(mockNotificationService.create).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.notificationLog.create).toHaveBeenCalledWith({
        data: {
          applicationId: "app-009",
          type: "application_validation_reminder",
        },
      });
    });

    it("should use the last metadata date as lastModifiedDate when available", async () => {
      const lastMetadataDate = new Date("2023-06-01T00:00:00.000Z");
      const staleApplicationWithMetadata = {
        id: "app-006",
        label: "Application Zeta",
        metadatas: [{ createdAt: lastMetadataDate }],
        actors: [{ email: "contact@example.com" }],
        notificationLogs: [],
      };

      mockPrismaService.application.count.mockResolvedValue(1);
      mockPrismaService.application.findMany.mockResolvedValue([
        staleApplicationWithMetadata,
      ]);
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockEmailService.sendApplicationValidationReminderEmail.mockResolvedValue(
        undefined,
      );
      mockPrismaService.notificationLog.create.mockResolvedValue({});

      await service.sendValidationReminders();

      expect(
        mockEmailService.sendApplicationValidationReminderEmail,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          lastModifiedDate: lastMetadataDate,
        }),
      );
    });
  });
});
