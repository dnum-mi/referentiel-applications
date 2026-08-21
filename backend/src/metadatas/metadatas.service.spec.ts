import { NotificationType } from "@prisma/client";
import type { NotificationService } from "src/notification/notification.service";
import type { PrismaService } from "src/prisma/prisma.service";
import { MetadatasService } from "./metadatas.service";
import type { MetadataRepository } from "./infrastructure/metadata.repository";

function buildService(overrides?: {
  applicationFindUnique?: unknown;
  userFindUnique?: unknown;
}) {
  const create = jest.fn().mockResolvedValue({ id: "metadata-1" });
  const applicationFindUnique = jest.fn().mockResolvedValue(
    overrides?.applicationFindUnique ?? {
      label: "Portail Agent",
      subscribers: [{ id: "subscriber-1" }, { id: "author-1" }],
    },
  );
  const userFindUnique = jest
    .fn()
    .mockResolvedValue(
      overrides?.userFindUnique ?? { email: "author@example.com" },
    );
  const createForUsers = jest.fn().mockResolvedValue(undefined);

  const prisma = {
    application: { findUnique: applicationFindUnique },
    user: { findUnique: userFindUnique },
  } as unknown as PrismaService;

  const metadataRepository = { create } as unknown as MetadataRepository;
  const notificationService = {
    createForUsers,
  } as unknown as NotificationService;

  const service = new MetadatasService(
    prisma,
    metadataRepository,
    notificationService,
  );

  return {
    service,
    create,
    applicationFindUnique,
    userFindUnique,
    createForUsers,
  };
}

describe("MetadatasService.createMetadata — notification des abonnés (#2280)", () => {
  it("notifie en temps réel les abonnés d'une application lors d'une mise à jour, avec le détail des champs modifiés", async () => {
    const { service, createForUsers } = buildService();

    await service.createMetadata({
      applicationId: "app-1",
      createdById: "author-1",
      title: "des informations générales",
      type: "update",
      fields: { label: "libellé" },
      oldData: { label: "Ancien nom" },
      newData: { label: "Nouveau nom" },
    });

    expect(createForUsers).toHaveBeenCalledWith(
      ["subscriber-1"],
      NotificationType.application_followed_changed,
      "Modification des informations générales (libellé) sur Portail Agent par author@example.com.",
      { link: "/applications/app-1", applicationId: "app-1" },
    );
  });

  it("exclut l'auteur du changement de la liste des destinataires", async () => {
    const { service, createForUsers } = buildService({
      applicationFindUnique: {
        label: "Portail Agent",
        subscribers: [{ id: "author-1" }],
      },
    });

    await service.createMetadata({
      applicationId: "app-1",
      createdById: "author-1",
      title: "des informations générales",
      type: "update",
      fields: { label: "libellé" },
      oldData: { label: "Ancien nom" },
      newData: { label: "Nouveau nom" },
    });

    expect(createForUsers).not.toHaveBeenCalled();
  });

  it("ne notifie personne quand la métadonnée n'a pas d'applicationId", async () => {
    const { service, create, createForUsers } = buildService();

    await service.createMetadata({
      createdById: "author-1",
      title: "un signalement global",
      type: "add",
    });

    expect(create).toHaveBeenCalled();
    expect(createForUsers).not.toHaveBeenCalled();
  });

  it("ne crée ni métadonnée ni notification quand la mise à jour ne change rien", async () => {
    const { service, create, createForUsers } = buildService();

    const result = await service.createMetadata({
      applicationId: "app-1",
      createdById: "author-1",
      title: "des informations générales",
      type: "update",
      fields: { label: "libellé" },
      oldData: { label: "Même nom" },
      newData: { label: "Même nom" },
    });

    expect(result).toBeNull();
    expect(create).not.toHaveBeenCalled();
    expect(createForUsers).not.toHaveBeenCalled();
  });
});
