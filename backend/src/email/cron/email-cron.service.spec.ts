import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "src/prisma/prisma.service";
import { EmailService } from "../email.service";
import { EmailController } from "../email.controller";
import { EmailLogService } from "../email-log.service";
import { EmailDigestCronService } from "./email-cron.service";

describe("EmailDigestCronService — journées Europe/Paris", () => {
  let service: EmailDigestCronService;
  let controller: EmailController;
  const prisma = {
    metadata: { findMany: jest.fn() },
    application: { findMany: jest.fn() },
  };
  const email = { sendDailyDigestNotification: jest.fn() };
  const config = { get: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.useFakeTimers({ now: new Date("2026-10-15T22:00:00Z") });
    config.get.mockReturnValue(true);
    prisma.metadata.findMany.mockResolvedValue([]);
    const module = await Test.createTestingModule({
      providers: [
        EmailDigestCronService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
        { provide: ConfigService, useValue: config },
        { provide: EmailLogService, useValue: {} },
      ],
    }).compile();
    service = module.get(EmailDigestCronService);
    controller = new EmailController(service, module.get(EmailLogService));
  });

  afterEach(() => jest.useRealTimers());

  it.each([
    [
      "reproduction #2947",
      "2026-10-15T22:00:00Z",
      "2026-10-14T22:00:00Z",
      "2026-10-15T22:00:00Z",
    ],
    [
      "heure d'été (23 h)",
      "2026-03-29T22:00:00Z",
      "2026-03-28T23:00:00Z",
      "2026-03-29T22:00:00Z",
    ],
    [
      "heure d'hiver (25 h)",
      "2026-10-25T23:00:00Z",
      "2026-10-24T22:00:00Z",
      "2026-10-25T23:00:00Z",
    ],
    [
      "changement de mois",
      "2026-04-30T22:00:00Z",
      "2026-04-29T22:00:00Z",
      "2026-04-30T22:00:00Z",
    ],
    [
      "changement d'année",
      "2026-12-31T23:00:00Z",
      "2026-12-30T23:00:00Z",
      "2026-12-31T23:00:00Z",
    ],
  ])(
    "%s : sélectionne et envoie uniquement les changements du jour",
    async (_label, now, start, end) => {
      jest.setSystemTime(new Date(now));
      const metadata = [
        new Date(start).getTime() - 1,
        new Date(start).getTime(),
        new Date(end).getTime() - 1,
        new Date(end).getTime(),
      ].map((timestamp, index) => ({
        id: `metadata-${index}`,
        applicationId: "app-1",
        action: "update",
        description: `change-${index}`,
        createdAt: new Date(timestamp),
      }));
      prisma.metadata.findMany.mockImplementation(({ where }) =>
        Promise.resolve(
          metadata.filter(
            (item) =>
              item.createdAt >= where.createdAt.gte &&
              item.createdAt < where.createdAt.lt,
          ),
        ),
      );
      prisma.application.findMany.mockResolvedValue([
        {
          id: "app-1",
          label: "Application",
          subscribers: [{ id: "user-1", email: "user@example.test" }],
        },
      ]);

      await service.handleDailyCron();

      expect(prisma.metadata.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            action: { not: "export" },
            createdAt: { gte: new Date(start), lt: new Date(end) },
          },
        }),
      );
      expect(email.sendDailyDigestNotification).toHaveBeenCalledTimes(1);
      expect(email.sendDailyDigestNotification).toHaveBeenCalledWith(
        "user@example.test",
        [
          {
            applicationId: "app-1",
            applicationLabel: "Application",
            changes: metadata
              .slice(1, 3)
              .map(({ action, description, createdAt }) => ({
                action,
                description,
                createdAt,
              })),
          },
        ],
      );
    },
  );

  it("interprète targetDate comme un instant dans la journée parisienne", async () => {
    await service.sendDailyDigest(new Date("2026-10-15T22:30:00Z"));
    expect(prisma.metadata.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: {
            gte: new Date("2026-10-15T22:00:00Z"),
            lt: new Date("2026-10-16T22:00:00Z"),
          },
        }),
      }),
    );
  });

  it.each(["today", "yesterday", undefined] as const)(
    "API day=%s utilise la journée parisienne",
    async (day) => {
      await controller.runDigest(day);
      expect(prisma.metadata.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt:
              day === "today"
                ? {
                    gte: new Date("2026-10-15T22:00:00Z"),
                    lt: new Date("2026-10-16T22:00:00Z"),
                  }
                : {
                    gte: new Date("2026-10-14T22:00:00Z"),
                    lt: new Date("2026-10-15T22:00:00Z"),
                  },
          }),
        }),
      );
    },
  );

  it("ne consulte pas les métadonnées lorsque le cron est désactivé", async () => {
    config.get.mockReturnValue(false);
    const module = await Test.createTestingModule({
      providers: [
        EmailDigestCronService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    await module.get(EmailDigestCronService).handleDailyCron();
    expect(prisma.metadata.findMany).not.toHaveBeenCalled();
    expect(email.sendDailyDigestNotification).not.toHaveBeenCalled();
  });
});
