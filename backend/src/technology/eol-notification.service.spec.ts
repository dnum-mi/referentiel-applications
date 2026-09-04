import { ConfigService } from "@nestjs/config";
import { NotificationType } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { NotificationService } from "src/notification/notification.service";
import { EolNotificationService } from "./eol-notification.service";
import { EOL_SOON_MS } from "./utils/eol-status";

const day = 24 * 60 * 60 * 1000;
const at = (offsetMs: number) => new Date(Date.now() + offsetMs);

const row = (overrides: Record<string, unknown> = {}) => ({
  id: "tech-1",
  applicationId: "app-1",
  product: "PostgreSQL",
  version: "13",
  eolDate: at(-10 * day),
  eoasDate: null,
  ...overrides,
});

const makeService = (
  rows: ReturnType<typeof row>[],
  logs: { type: string }[] = [],
  notifyEnabled = true,
) => {
  const findMany = jest.fn().mockResolvedValue(rows);
  const logFindMany = jest.fn().mockResolvedValue(logs);
  const logCreateMany = jest.fn().mockResolvedValue({ count: 0 });
  const prisma = {
    technologyStack: { findMany },
    notificationLog: { findMany: logFindMany, createMany: logCreateMany },
  } as unknown as PrismaService;

  const findUsersToNotifyForTechnology = jest
    .fn()
    .mockResolvedValue(["user-1"]);
  const createForUsers = jest.fn().mockResolvedValue(undefined);
  const notifications = {
    findUsersToNotifyForTechnology,
    createForUsers,
  } as unknown as NotificationService;

  const config = {
    get: (key: string, fallback: unknown) =>
      key === "technology.eolNotifyEnabled" ? notifyEnabled : fallback,
  } as unknown as ConfigService;

  return {
    service: new EolNotificationService(prisma, notifications, config),
    findMany,
    createForUsers,
    findUsersToNotifyForTechnology,
    logCreateMany,
    logFindMany,
  };
};

describe("EolNotificationService", () => {
  it("n'émet rien tant que les notifications ne sont pas activées", async () => {
    const { service, createForUsers } = makeService([row()], [], false);
    expect(await service.notifyPendingEndOfLife()).toBeNull();
    expect(createForUsers).not.toHaveBeenCalled();
  });

  it("alerte les gestionnaires de l'application concernée", async () => {
    const { service, createForUsers } = makeService([row()]);
    const result = await service.notifyPendingEndOfLife();

    expect(result).toMatchObject({
      newlyConcerned: 1,
      applications: 1,
      notified: 1,
    });
    expect(createForUsers).toHaveBeenCalledWith(
      ["user-1"],
      NotificationType.technology_end_of_life,
      "PostgreSQL 13 est en fin de vie.",
      {
        applicationId: "app-1",
        link: "/applications/app-1/tab-technologies",
      },
    );
  });

  /**
   * Le cœur de l'anti-spam : une technologie ne doit déclencher qu'une alerte par
   * palier franchi, pas une par exécution du cron.
   */
  it("n'alerte pas deux fois pour la même technologie au même statut", async () => {
    const { service, createForUsers } = makeService(
      [row()],
      [{ type: "technology_eol:tech-1:eol" }],
    );
    const result = await service.notifyPendingEndOfLife();

    expect(result).toMatchObject({ newlyConcerned: 0, notified: 0 });
    expect(createForUsers).not.toHaveBeenCalled();
  });

  // Une échéance connue de longue date finit par arriver à terme : le passage de
  // « proche » à « dépassée » est justement ce qu'il faut annoncer.
  it("alerte de nouveau lorsque la technologie franchit un palier", async () => {
    const { service, createForUsers } = makeService(
      [row()],
      [{ type: "technology_eol:tech-1:eol-soon" }],
    );
    const result = await service.notifyPendingEndOfLife();

    expect(result).toMatchObject({ newlyConcerned: 1 });
    expect(createForUsers).toHaveBeenCalledTimes(1);
  });

  it("regroupe en un seul message les technologies d'une même application", async () => {
    const { service, createForUsers } = makeService([
      row(),
      row({
        id: "tech-2",
        product: "Python",
        version: "3.9",
        eolDate: at(30 * day),
      }),
    ]);
    await service.notifyPendingEndOfLife();

    expect(createForUsers).toHaveBeenCalledTimes(1);
    expect(createForUsers.mock.calls[0][2]).toBe(
      "2 technologies à surveiller : PostgreSQL 13 est en fin de vie ; Python 3.9 arrive en fin de vie dans moins de 6 mois.",
    );
  });

  it("sépare les applications", async () => {
    const { service, createForUsers } = makeService([
      row(),
      row({ id: "tech-3", applicationId: "app-2" }),
    ]);
    const result = await service.notifyPendingEndOfLife();

    expect(result).toMatchObject({ applications: 2, notified: 2 });
    expect(createForUsers).toHaveBeenCalledTimes(2);
  });

  /**
   * Sans journalisation, une application dépourvue d'acteur porteur de
   * `TechnologyWrite` serait réexaminée à chaque exécution et deviendrait bruyante
   * le jour où un acteur lui est enfin rattaché.
   */
  it("journalise même quand personne n'est à prévenir", async () => {
    const {
      service,
      createForUsers,
      logCreateMany,
      findUsersToNotifyForTechnology,
    } = makeService([row()]);
    findUsersToNotifyForTechnology.mockResolvedValue([]);

    const result = await service.notifyPendingEndOfLife();

    expect(createForUsers).not.toHaveBeenCalled();
    expect(result).toMatchObject({ newlyConcerned: 1, notified: 0 });
    expect(logCreateMany).toHaveBeenCalledWith({
      data: [{ applicationId: "app-1", type: "technology_eol:tech-1:eol" }],
      skipDuplicates: true,
    });
  });

  it("ignore les technologies dont l'échéance reste lointaine", async () => {
    const { service, createForUsers } = makeService([
      row({ eolDate: at(EOL_SOON_MS + 30 * day), eoasDate: null }),
    ]);
    const result = await service.notifyPendingEndOfLife();

    expect(result).toMatchObject({ newlyConcerned: 0 });
    expect(createForUsers).not.toHaveBeenCalled();
  });

  it("ne consulte le journal que des applications concernées", async () => {
    const { service, logFindMany } = makeService([
      row(),
      row({ id: "tech-3", applicationId: "app-2" }),
    ]);
    await service.notifyPendingEndOfLife();

    const { where } = logFindMany.mock.calls[0][0];
    expect(where.applicationId.in.sort()).toEqual(["app-1", "app-2"]);
    expect(where.type).toEqual({ startsWith: "technology_eol:" });
  });
});

describe("EolNotificationService — applications supprimées (#2515)", () => {
  it("ne sélectionne que les technologies d'applications non supprimées", async () => {
    const { service, findMany } = makeService([]);
    await service.notifyPendingEndOfLife();
    const { where } = findMany.mock.calls[0][0];
    expect(where.application).toEqual({
      currentStatus: { status: { not: "deleted" } },
    });
    // Le filtre de statut de fin de vie reste appliqué.
    expect(where.OR).toBeDefined();
  });
});
