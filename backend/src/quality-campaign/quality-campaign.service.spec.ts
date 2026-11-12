import type { CheckPermissions } from "src/common/service/check-permissions.service";
import { NotificationType } from "@prisma/client";
import { emailIn } from "src/common/utils/email.utils";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { ApplicationService } from "src/applications/application.service";
import type { EmailService } from "src/email/email.service";
import type { NotificationService } from "src/notification/notification.service";
import type { PrismaService } from "src/prisma/prisma.service";
import { QualityCampaignService } from "./quality-campaign.service";

function buildService(overrides: {
  prisma?: Partial<PrismaService>;
  checkPermissions?: Partial<CheckPermissions>;
  applicationService?: Partial<ApplicationService>;
  emailService?: Partial<EmailService>;
  notificationService?: Partial<NotificationService>;
}) {
  return new QualityCampaignService(
    (overrides.prisma ?? {}) as PrismaService,
    (overrides.applicationService ?? {}) as ApplicationService,
    (overrides.emailService ?? {}) as EmailService,
    (overrides.notificationService ?? {}) as NotificationService,
    (overrides.checkPermissions ?? {}) as CheckPermissions,
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
  status: "scheduled" as const,
  createdById: "user-1",
  createdAt: new Date("2025-12-01"),
};

describe("QualityCampaignService", () => {
  it("creates a campaign owned by the requesting user", async () => {
    const create = jest
      .fn()
      .mockResolvedValue({ ...baseCampaign, targets: [] });
    const search = jest
      .fn()
      .mockResolvedValue({ results: [], total: 0, averageIq: null });
    const service = buildService({
      prisma: { qualityCampaign: { create } } as never,
      applicationService: { search } as never,
    });

    await service.create(
      "user-1",
      {
        name: "Campagne test",
        filters: { iqLte: 50 },
        startDate: new Date("2026-01-01"),
      },
      {} as never,
    );

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
    const search = jest
      .fn()
      .mockResolvedValue({ results: [], total: 0, averageIq: null });
    const service = buildService({
      prisma: { qualityCampaign: { create } } as never,
      applicationService: { search } as never,
    });

    await service.create(
      "user-1",
      {
        name: "Campagne test",
        filters: { iqLte: 50 },
        startDate: new Date("2026-01-01"),
        sponsorEmails: ["sponsor-a@example.com", "sponsor-b@example.com"],
      },
      {} as never,
    );

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
      status: "in_progress",
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
    expect(dto.status).toBe("in_progress");
  });

  it("marks a campaign without any sent date as scheduled", async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ ...baseCampaign, targets: [] });
    // Campagne jamais envoyée : `targetCount` est calculé en direct depuis le filtre plutôt que
    // depuis `targets` (vide tant que non envoyée) — cf. toDtoWithLiveTargetCount.
    const search = jest
      .fn()
      .mockResolvedValue({ results: [], total: 0, averageIq: null });
    const service = buildService({
      prisma: { qualityCampaign: { findUnique } } as never,
      applicationService: { search } as never,
    });

    const dto = await service.findOne("campaign-1");

    expect(dto.status).toBe("scheduled");
    expect(dto.targetCount).toBe(0);
    expect(dto.averageIqAtStart).toBeNull();
  });

  it("computes targetCount live from the current filter match while a campaign is still unsent", async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue({ ...baseCampaign, targets: [] });
    const search = jest
      .fn()
      .mockResolvedValue({ results: [], total: 42, averageIq: 12 });
    const service = buildService({
      prisma: { qualityCampaign: { findUnique } } as never,
      applicationService: { search } as never,
    });

    const dto = await service.findOne("campaign-1");

    expect(search).toHaveBeenCalled();
    expect(dto.targetCount).toBe(42);
  });

  it("throws NotFoundException when the campaign does not exist", async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const service = buildService({
      prisma: { qualityCampaign: { findUnique } } as never,
    });

    await expect(service.findOne("missing")).rejects.toThrow(NotFoundException);
  });

  it("rejects updating the filters of a campaign that is no longer scheduled", async () => {
    const findUnique = jest.fn().mockResolvedValue({
      ...baseCampaign,
      sentAt: new Date("2026-01-05"),
      status: "in_progress",
      targets: [],
    });
    const service = buildService({
      prisma: { qualityCampaign: { findUnique } } as never,
    });

    await expect(
      service.update("campaign-1", { filters: { iqLte: 10 } }),
    ).rejects.toThrow(BadRequestException);
  });

  it("still allows updating the start date of a campaign that is no longer scheduled", async () => {
    const findUnique = jest.fn().mockResolvedValue({
      ...baseCampaign,
      sentAt: new Date("2026-01-05"),
      status: "in_progress",
      targets: [],
    });
    const update = jest
      .fn()
      .mockResolvedValue({ ...baseCampaign, targets: [] });
    const service = buildService({
      prisma: { qualityCampaign: { findUnique, update } } as never,
    });

    const newStartDate = new Date("2026-02-01");
    await service.update("campaign-1", { startDate: newStartDate });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ startDate: newStartDate }),
      }),
    );
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
    const update = jest.fn().mockResolvedValue({});
    const search = jest.fn().mockResolvedValue({
      results: [{ id: "app-1", label: "App A", quality: 55 }],
      total: 1,
      averageIq: 55,
    });
    const actorFindMany = jest.fn().mockResolvedValue([]);

    const service = buildService({
      prisma: {
        qualityCampaign: { findUnique, updateMany, update },
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
    // La campagne était encore "scheduled" : le statut avance à "in_progress" séparément.
    expect(update).toHaveBeenCalledWith({
      where: { id: "campaign-1" },
      data: { status: "in_progress" },
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

  it("does not override a status manually corrected away from scheduled when sending a campaign", async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce({
        ...baseCampaign,
        status: "done",
        targets: [],
      }) // getRaw in sendCampaign
      .mockResolvedValueOnce({
        ...baseCampaign,
        status: "done",
        sentAt: new Date(),
        targets: [],
      }); // getRaw in findOne (via the final return)
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const update = jest.fn().mockResolvedValue({});
    const search = jest.fn().mockResolvedValue({
      results: [],
      total: 0,
      averageIq: null,
    });

    const service = buildService({
      prisma: {
        qualityCampaign: { findUnique, updateMany, update },
      } as never,
      applicationService: { search } as never,
    });

    await service.sendCampaign("campaign-1");

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "campaign-1", sentAt: null },
      data: { sentAt: expect.any(Date) },
    });
    // Le statut était déjà "done" : pas de retour en arrière vers "in_progress".
    expect(update).not.toHaveBeenCalled();
  });

  it("lets the status of an already-sent campaign be changed freely to any value, without re-resolving targets", async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce({
        ...baseCampaign,
        status: "in_progress",
        sentAt: new Date(),
        targets: [],
      }) // getRaw
      .mockResolvedValueOnce({
        ...baseCampaign,
        status: "done",
        sentAt: new Date(),
        targets: [],
      }); // getRaw in findOne
    const update = jest.fn().mockResolvedValue({});
    const search = jest.fn();
    const service = buildService({
      prisma: { qualityCampaign: { findUnique, update } } as never,
      applicationService: { search } as never,
    });

    const dto = await service.updateStatus("campaign-1", "done" as never);

    expect(update).toHaveBeenCalledWith({
      where: { id: "campaign-1" },
      data: { status: "done" },
    });
    expect(search).not.toHaveBeenCalled();
    expect(dto.status).toBe("done");
  });

  it("resolves targets and notifies actors when a never-sent scheduled campaign moves to another status", async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce({ ...baseCampaign, targets: [] }) // getRaw
      .mockResolvedValueOnce({
        ...baseCampaign,
        status: "in_progress",
        sentAt: new Date(),
        targets: [
          { iqAtStart: 40, application: { label: "App A", quality: 40 } },
        ],
      }); // getRaw in findOne
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const update = jest.fn().mockResolvedValue({});
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const search = jest.fn().mockResolvedValue({
      results: [{ id: "app-1", label: "App A", quality: 40 }],
      total: 1,
      averageIq: 40,
    });
    const actorFindMany = jest.fn().mockResolvedValue([]);

    const service = buildService({
      prisma: {
        qualityCampaign: { findUnique, updateMany, update },
        qualityCampaignTarget: { createMany },
        actor: { findMany: actorFindMany },
      } as never,
      applicationService: { search } as never,
    });

    const dto = await service.updateStatus(
      "campaign-1",
      "in_progress" as never,
    );

    expect(search).toHaveBeenCalled();
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { campaignId: "campaign-1", applicationId: "app-1", iqAtStart: 40 },
      ],
      skipDuplicates: true,
    });
    // Le verrou atomique (#2376) pose `sentAt` avant la résolution des cibles...
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "campaign-1", sentAt: null },
      data: { sentAt: expect.any(Date) },
    });
    // ...puis le statut demandé est posé séparément.
    expect(update).toHaveBeenCalledWith({
      where: { id: "campaign-1" },
      data: { status: "in_progress" },
    });
    expect(dto.targetCount).toBe(1);
  });

  it("allows sending a sponsor report regardless of the campaign's status (still scheduled)", async () => {
    const findUnique = jest.fn().mockResolvedValue({
      ...baseCampaign,
      status: "scheduled",
      sponsorEmails: ["sponsor-a@example.com"],
      targets: [],
    });
    const actionLogFindMany = jest.fn().mockResolvedValue([]);
    const sendQualityCampaignSponsorReportEmail = jest
      .fn()
      .mockResolvedValue({ id: "email-log-1" });
    const userFindMany = jest.fn().mockResolvedValue([]);
    const createForUsers = jest.fn().mockResolvedValue(undefined);
    const search = jest
      .fn()
      .mockResolvedValue({ results: [], total: 0, averageIq: null });
    const service = buildService({
      prisma: {
        qualityCampaign: { findUnique },
        user: { findMany: userFindMany },
        qualityCampaignActionLog: { findMany: actionLogFindMany },
      } as never,
      emailService: { sendQualityCampaignSponsorReportEmail } as never,
      notificationService: { createForUsers } as never,
      applicationService: { search } as never,
    });

    await expect(
      service.sendSponsorReport("campaign-1"),
    ).resolves.toBeDefined();
    expect(sendQualityCampaignSponsorReportEmail).toHaveBeenCalled();
  });

  it("rejects sending a sponsor report when no sponsor email is configured", async () => {
    const findUnique = jest.fn().mockResolvedValue({
      ...baseCampaign,
      sentAt: new Date(),
      status: "in_progress",
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
      status: "in_progress",
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
    const actionLogFindMany = jest.fn().mockResolvedValue([]);
    const service = buildService({
      prisma: {
        qualityCampaign: { findUnique },
        user: { findMany: userFindMany },
        qualityCampaignActionLog: { findMany: actionLogFindMany },
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
      where: emailIn(["sponsor-a@example.com", "sponsor-b@example.com"]),
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

describe("QualityCampaignService — frozen targets", () => {
  const targets = [
    {
      applicationId: "a",
      iqAtStart: 50,
      application: { label: "Improved", quality: 65 },
    },
    {
      applicationId: "b",
      iqAtStart: 50,
      application: { label: "Stable", quality: 50 },
    },
    {
      applicationId: "c",
      iqAtStart: null,
      application: { label: "Unknown start", quality: 40 },
    },
    {
      applicationId: "d",
      iqAtStart: 50,
      application: { label: "Declined", quality: 30 },
    },
    {
      applicationId: "e",
      iqAtStart: 50,
      application: { label: "Unknown current", quality: null },
    },
    {
      applicationId: "f",
      iqAtStart: 0,
      application: { label: "Zero", quality: 0 },
    },
  ];
  function setup() {
    const campaign = { ...baseCampaign, sentAt: new Date(), targets };
    const findUnique = jest.fn().mockResolvedValue(campaign);
    const can = jest.fn().mockResolvedValue(true);
    const search = jest.fn();
    return {
      campaign,
      findUnique,
      can,
      search,
      service: buildService({
        prisma: { qualityCampaign: { findUnique } } as never,
        checkPermissions: { can },
        applicationService: { search },
      }),
    };
  }
  const query = { page: 0, pageSize: 15, order: "asc" as const };
  it("uses the frozen population, preserves null/zero and agrees with impact aggregates", async () => {
    const { service, campaign, search } = setup();
    const result = await service.findTargets(campaign.id, query, {} as never);
    expect(result.results.map((t) => [t.applicationId, t.delta])).toEqual([
      ["d", -20],
      ["b", 0],
      ["f", 0],
      ["a", 15],
      ["c", null],
      ["e", null],
    ]);
    const impact = await service.findOne(campaign.id);
    expect(impact.targetCount).toBe(result.total);
    expect(impact.averageDelta).toBe(-1.25);
    expect(impact.averageIqAtStart).toBe(40);
    expect(impact.averageIqCurrent).toBe(37);
    campaign.filters = { iqLte: 1 };
    expect(await service.findTargets(campaign.id, query, {} as never)).toEqual(
      result,
    );
    expect(search).not.toHaveBeenCalled();
  });
  it.each([
    ["positive", ["a"]],
    ["stable_or_declining", ["d", "b", "f"]],
    ["not_comparable", ["c", "e"]],
  ] as const)("filters %s before pagination", async (progression, ids) => {
    const { service } = setup();
    const result = await service.findTargets(
      "campaign-1",
      { ...query, progression, pageSize: 1 },
      {} as never,
    );
    expect(result.total).toBe(ids.length);
    expect(result.results.map((t) => t.applicationId)).toEqual(ids.slice(0, 1));
  });
  it("sorts all targets before paging, keeps nulls last and ties deterministic", async () => {
    const { service } = setup();
    const result = await service.findTargets(
      "campaign-1",
      { ...query, order: "desc", page: 1, pageSize: 2 },
      {} as never,
    );
    expect(result.results.map((t) => t.applicationId)).toEqual(["f", "d"]);
    expect(
      (
        await service.findTargets(
          "campaign-1",
          { ...query, order: "desc", page: 2, pageSize: 2 },
          {} as never,
        )
      ).results.map((t) => t.applicationId),
    ).toEqual(["c", "e"]);
  });
  it.each([
    ["label", "asc", ["d", "a", "b", "e", "c", "f"]],
    ["label", "desc", ["f", "c", "e", "b", "a", "d"]],
    ["iqAtStart", "asc", ["f", "a", "b", "d", "e", "c"]],
    ["iqAtStart", "desc", ["a", "b", "d", "e", "f", "c"]],
    ["iqCurrent", "asc", ["f", "d", "c", "b", "a", "e"]],
    ["iqCurrent", "desc", ["a", "b", "c", "d", "f", "e"]],
  ] as const)(
    "sorts %s %s before pagination with unknown IQ last",
    async (sortBy, order, expected) => {
      const { service } = setup();
      const all = await service.findTargets(
        "campaign-1",
        { ...query, sortBy, order },
        {} as never,
      );
      expect(all.results.map((t) => t.applicationId)).toEqual(expected);
      const page = await service.findTargets(
        "campaign-1",
        { ...query, sortBy, order, page: 1, pageSize: 2 },
        {} as never,
      );
      expect(page.results.map((t) => t.applicationId)).toEqual(
        expected.slice(2, 4),
      );
    },
  );
  it("excludes unreadable applications from both rows and total before pagination", async () => {
    const { service, can } = setup();
    can.mockImplementation(async (_permissions, _user, id) => id === "a");
    const result = await service.findTargets(
      "campaign-1",
      { ...query, pageSize: 1 },
      {} as never,
    );
    expect(result.total).toBe(1);
    expect(result.results.map((t) => t.applicationId)).toEqual(["a"]);
    expect(can).toHaveBeenCalledWith(["AppRead"], {}, "a");
  });
  it("rejects missing and unsent campaigns, but accepts sent campaigns marked scheduled", async () => {
    const { service, findUnique, campaign } = setup();
    await expect(
      service.findTargets(campaign.id, query, {} as never),
    ).resolves.toHaveProperty("total", 6);
    findUnique.mockResolvedValueOnce(null);
    await expect(
      service.findTargets("missing", query, {} as never),
    ).rejects.toThrow(NotFoundException);
    findUnique.mockResolvedValueOnce({ ...campaign, sentAt: null });
    await expect(
      service.findTargets(campaign.id, query, {} as never),
    ).rejects.toThrow(BadRequestException);
  });
});
