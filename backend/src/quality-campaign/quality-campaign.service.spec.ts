import { NotificationType } from "@prisma/client";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { ApplicationService } from "src/applications/application.service";
import type { EmailService } from "src/email/email.service";
import type { NotificationService } from "src/notification/notification.service";
import type { PrismaService } from "src/prisma/prisma.service";
import { QualityCampaignService } from "./quality-campaign.service";

function buildService(overrides: {
  prisma?: Partial<PrismaService>;
  applicationService?: Partial<ApplicationService>;
  emailService?: Partial<EmailService>;
  notificationService?: Partial<NotificationService>;
}) {
  return new QualityCampaignService(
    (overrides.prisma ?? {}) as PrismaService,
    (overrides.applicationService ?? {}) as ApplicationService,
    (overrides.emailService ?? {}) as EmailService,
    (overrides.notificationService ?? {}) as NotificationService,
  );
}

const baseCampaign = {
  id: "campaign-1",
  name: "Campagne test",
  filters: { iqLte: 50 },
  message: null,
  sponsorEmails: [] as string[],
  startDate: new Date("2026-01-01"),
  endDate: null,
  sentAt: null,
  createdById: "user-1",
  createdAt: new Date("2025-12-01"),
};

describe("QualityCampaignService", () => {
  it("creates a campaign owned by the requesting user", async () => {
    const create = jest
      .fn()
      .mockResolvedValue({ ...baseCampaign, targets: [] });
    const service = buildService({
      prisma: { qualityCampaign: { create } } as never,
    });

    await service.create("user-1", {
      name: "Campagne test",
      filters: { iqLte: 50 },
      startDate: new Date("2026-01-01"),
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          createdById: "user-1",
          name: "Campagne test",
        }),
      }),
    );
  });

  it("stores an empty sponsor list by default and a list of several sponsors when provided", async () => {
    const create = jest
      .fn()
      .mockResolvedValue({ ...baseCampaign, targets: [] });
    const service = buildService({
      prisma: { qualityCampaign: { create } } as never,
    });

    await service.create("user-1", {
      name: "Campagne test",
      filters: { iqLte: 50 },
      startDate: new Date("2026-01-01"),
      sponsorEmails: ["sponsor-a@example.com", "sponsor-b@example.com"],
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sponsorEmails: ["sponsor-a@example.com", "sponsor-b@example.com"],
        }),
      }),
    );
  });

  it("computes impact as the average delta between iqAtStart and the applications' current quality", async () => {
    const findUnique = jest.fn().mockResolvedValue({
      ...baseCampaign,
      sentAt: new Date("2026-01-05"),
      targets: [
        { iqAtStart: 40, application: { label: "App A", quality: 60 } },
        { iqAtStart: 20, application: { label: "App B", quality: 30 } },
      ],
    });
    const service = buildService({
      prisma: { qualityCampaign: { findUnique } } as never,
    });

    const dto = await service.findOne("campaign-1");

    expect(dto.targetCount).toBe(2);
    expect(dto.averageIqAtStart).toBe(30);
    expect(dto.averageIqCurrent).toBe(45);
    expect(dto.averageDelta).toBe(15);
    expect(dto.status).toBe("sent");
  });

  it("marks a campaign without any sent date as scheduled", async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ ...baseCampaign, targets: [] });
    const service = buildService({
      prisma: { qualityCampaign: { findUnique } } as never,
    });

    const dto = await service.findOne("campaign-1");

    expect(dto.status).toBe("scheduled");
    expect(dto.targetCount).toBe(0);
    expect(dto.averageIqAtStart).toBeNull();
  });

  it("throws NotFoundException when the campaign does not exist", async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const service = buildService({
      prisma: { qualityCampaign: { findUnique } } as never,
    });

    await expect(service.findOne("missing")).rejects.toThrow(NotFoundException);
  });

  it("rejects updating the filters or the start date of an already-sent campaign", async () => {
    const findUnique = jest.fn().mockResolvedValue({
      ...baseCampaign,
      sentAt: new Date("2026-01-05"),
      targets: [],
    });
    const service = buildService({
      prisma: { qualityCampaign: { findUnique } } as never,
    });

    await expect(
      service.update("campaign-1", { filters: { iqLte: 10 } }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects sending a campaign that was already sent", async () => {
    const findUnique = jest.fn().mockResolvedValue({
      ...baseCampaign,
      sentAt: new Date("2026-01-05"),
      targets: [],
    });
    const service = buildService({
      prisma: { qualityCampaign: { findUnique } } as never,
    });

    await expect(service.sendCampaign("campaign-1")).rejects.toThrow(
      BadRequestException,
    );
  });

  it("snapshots iqAtStart from the search results when sending a campaign", async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce({ ...baseCampaign, targets: [] }) // getRaw in sendCampaign
      .mockResolvedValueOnce({
        ...baseCampaign,
        sentAt: new Date(),
        targets: [
          { iqAtStart: 55, application: { label: "App A", quality: 55 } },
        ],
      }); // getRaw in findOne (via the final return)
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const search = jest.fn().mockResolvedValue({
      results: [{ id: "app-1", label: "App A", quality: 55 }],
      total: 1,
      averageIq: 55,
    });
    const actorFindMany = jest.fn().mockResolvedValue([]);

    const service = buildService({
      prisma: {
        qualityCampaign: { findUnique, updateMany },
        qualityCampaignTarget: { createMany },
        actor: { findMany: actorFindMany },
      } as never,
      applicationService: { search } as never,
    });

    await service.sendCampaign("campaign-1");

    // Le verrou atomique est posé sur `sentAt: null` AVANT l'envoi (#2376).
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "campaign-1", sentAt: null },
      data: { sentAt: expect.any(Date) },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { campaignId: "campaign-1", applicationId: "app-1", iqAtStart: 55 },
      ],
      skipDuplicates: true,
    });
  });

  it("n'envoie pas quand le verrou est déjà pris par une exécution concurrente (#2376)", async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ ...baseCampaign, targets: [] }); // getRaw voit sentAt null…
    const updateMany = jest.fn().mockResolvedValue({ count: 0 }); // …mais le verrou a déjà été pris
    const createMany = jest.fn();
    const search = jest.fn();

    const service = buildService({
      prisma: {
        qualityCampaign: { findUnique, updateMany },
        qualityCampaignTarget: { createMany },
      } as never,
      applicationService: { search } as never,
    });

    await expect(service.sendCampaign("campaign-1")).rejects.toThrow(
      BadRequestException,
    );
    expect(search).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });

  it("rejects sending a sponsor report for a campaign not yet sent", async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ ...baseCampaign, targets: [] });
    const service = buildService({
      prisma: { qualityCampaign: { findUnique } } as never,
    });

    await expect(service.sendSponsorReport("campaign-1")).rejects.toThrow(
      BadRequestException,
    );
  });

  it("rejects sending a sponsor report when no sponsor email is configured", async () => {
    const findUnique = jest.fn().mockResolvedValue({
      ...baseCampaign,
      sentAt: new Date(),
      sponsorEmails: [],
      targets: [],
    });
    const service = buildService({
      prisma: { qualityCampaign: { findUnique } } as never,
    });

    await expect(service.sendSponsorReport("campaign-1")).rejects.toThrow(
      BadRequestException,
    );
  });

  it("sends the sponsor report to every sponsor in the list", async () => {
    const findUnique = jest.fn().mockResolvedValue({
      ...baseCampaign,
      sentAt: new Date("2026-01-05"),
      sponsorEmails: ["sponsor-a@example.com", "sponsor-b@example.com"],
      targets: [
        { iqAtStart: 40, application: { label: "App A", quality: 60 } },
      ],
    });
    const sendQualityCampaignSponsorReportEmail = jest
      .fn()
      .mockResolvedValue({ id: "email-log-1" });
    const userFindMany = jest
      .fn()
      .mockResolvedValue([{ id: "user-sponsor-a" }, { id: "user-sponsor-b" }]);
    const createForUsers = jest.fn().mockResolvedValue(undefined);
    const service = buildService({
      prisma: {
        qualityCampaign: { findUnique },
        user: { findMany: userFindMany },
      } as never,
      emailService: { sendQualityCampaignSponsorReportEmail } as never,
      notificationService: { createForUsers } as never,
    });

    await service.sendSponsorReport("campaign-1");

    expect(sendQualityCampaignSponsorReportEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmails: ["sponsor-a@example.com", "sponsor-b@example.com"],
      }),
    );
    expect(userFindMany).toHaveBeenCalledWith({
      where: {
        email: { in: ["sponsor-a@example.com", "sponsor-b@example.com"] },
      },
      select: { id: true },
    });
    expect(createForUsers).toHaveBeenCalledWith(
      ["user-sponsor-a", "user-sponsor-b"],
      "campaign_quality_sponsor_report",
      expect.any(String),
      expect.objectContaining({
        link: "/administration",
        emailLogId: "email-log-1",
      }),
    );
  });

  it("écrit NULL en base quand message et endDate sont explicitement vidés (#2387)", async () => {
    const findUnique = jest.fn().mockResolvedValue({
      ...baseCampaign,
      sentAt: null,
      targets: [],
    });
    const update = jest.fn().mockResolvedValue({
      ...baseCampaign,
      message: null,
      endDate: null,
      targets: [],
    });
    const service = buildService({
      prisma: {
        qualityCampaign: { findUnique, update },
      } as never,
    });

    await service.update("campaign-1", { message: null, endDate: null });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "campaign-1" },
        data: expect.objectContaining({ message: null, endDate: null }),
      }),
    );
  });

  it("respecte l'opt-out email même si la casse diffère entre acteur et compte (#2381)", async () => {
    const actorFindMany = jest
      .fn()
      .mockResolvedValue([
        { email: "Jean.Dupont@example.com" },
        { email: "Alice@example.com" },
      ]);
    // Le compte de Jean est en minuscules et a désactivé les emails ; celui d'Alice les accepte.
    const userFindMany = jest.fn().mockResolvedValue([
      {
        id: "u-jean",
        email: "jean.dupont@example.com",
        emailNotificationsEnabled: false,
      },
      {
        id: "u-alice",
        email: "alice@example.com",
        emailNotificationsEnabled: true,
      },
    ]);
    const sendReminder = jest.fn().mockResolvedValue({ id: "log-alice" });
    const createNotif = jest.fn().mockResolvedValue(undefined);

    const service = buildService({
      prisma: {
        actor: { findMany: actorFindMany },
        user: { findMany: userFindMany },
      } as never,
      emailService: {
        sendQualityCampaignReminderEmail: sendReminder,
      } as never,
      notificationService: { create: createNotif } as never,
    });

    await (
      service as unknown as {
        notifyApplicationActors: (c: unknown, a: unknown) => Promise<void>;
      }
    ).notifyApplicationActors(baseCampaign, {
      id: "app-1",
      label: "App 1",
      quality: 42,
    });

    // Jean (opt-out, casse différente) ne reçoit pas d'email ; Alice oui.
    expect(sendReminder).toHaveBeenCalledTimes(1);
    expect(sendReminder).toHaveBeenCalledWith(
      expect.objectContaining({ recipientEmail: "Alice@example.com" }),
    );
    // Les deux ont une notification in-app ; seule celle d'Alice porte l'emailLogId.
    expect(createNotif).toHaveBeenCalledWith(
      "u-alice",
      NotificationType.campaign_quality_reminder,
      expect.any(String),
      expect.objectContaining({ emailLogId: "log-alice" }),
    );
    expect(createNotif).toHaveBeenCalledWith(
      "u-jean",
      NotificationType.campaign_quality_reminder,
      expect.any(String),
      expect.objectContaining({ emailLogId: undefined }),
    );
  });
});
