import { Permission, Roles } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { Requestor } from "src/user/entities/user.entity";
import { CheckPermissions } from "./check-permissions.service";
import { QueryBuilderGroupActor } from "./prisma-query-builder.service";

/** Matrice AppPermissions en LECTURE SEULE : tous les *Read, aucun *Write. */
const READ_ONLY_MATRIX = {
  actorTypeId: "at-1",
  AppRead: true,
  AppWrite: false,
  AppWritePriority: false,
  ActorRead: true,
  ActorWrite: false,
  ComplianceRead: true,
  ComplianceWrite: false,
  HostingRead: true,
  HostingWrite: false,
  MetadataRead: true,
  DataRead: true,
  DataWrite: false,
  TechnologyRead: true,
  TechnologyWrite: false,
  RelationRead: true,
  RelationWrite: false,
  LinkRead: true,
  LinkWrite: false,
  ReportRead: true,
  ReportPost: false,
  ReportManage: false,
};

/** Un acteur (par email) avec la matrice lecture seule. */
const emailActor = () => ({
  actorType: { appPermissions: [READ_ONLY_MATRIX] },
});

const makeService = (findManyResult: unknown[]) => {
  const prisma = {
    actor: { findMany: jest.fn().mockResolvedValue(findManyResult) },
    actorType: { findMany: jest.fn().mockResolvedValue([]) },
    application: { findFirst: jest.fn().mockResolvedValue(null) },
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
  };
  const queryBuilder = {
    buildByApplication: jest.fn().mockReturnValue(""),
  };
  const service = new CheckPermissions(
    prisma as unknown as PrismaService,
    queryBuilder as unknown as QueryBuilderGroupActor,
  );
  return { service, prisma };
};

// Utilisateur sans rôle applicatif (VISITOR) ni scope : la SEULE source de droits
// applicatifs est l'acteur, ce qui isole le comportement de `getUserAppPermissions`.
const baseUser = (): Requestor =>
  ({
    email: "user@example.com",
    role: Roles.VISITOR,
    organization: null,
    scopeOrganization: undefined,
    permissions: [],
    additionalPermissions: [],
  }) as unknown as Requestor;

describe("CheckPermissions.getUserAppPermissions", () => {
  it("acteur : dispose exactement des droits de la matrice de son type (lecture seule)", async () => {
    const { service } = makeService([emailActor()]);
    const user = baseUser();

    // Lecture accordée par la matrice.
    expect(await service.can([Permission.AppRead], user, "app-1")).toBe(true);
    // Écriture refusée : la matrice ne l'accorde pas.
    expect(await service.can([Permission.AppWrite], user, "app-1")).toBe(false);
    expect(await service.can([Permission.ActorWrite], user, "app-1")).toBe(
      false,
    );
    expect(await service.can([Permission.ReportManage], user, "app-1")).toBe(
      false,
    );
  });

  it("droits bornés à l'application concernée (aucun acteur sur l'app cible → aucun droit applicatif)", async () => {
    // La requête d'acteurs est filtrée par applicationId : ici aucun acteur trouvé
    // pour l'app cible → aucun droit applicatif, même si l'utilisateur est acteur
    // d'une AUTRE application.
    const { service, prisma } = makeService([]);
    const user = baseUser();

    expect(await service.can([Permission.AppWrite], user, "other-app")).toBe(
      false,
    );
    expect(prisma.actor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ applicationId: "other-app" }),
      }),
    );
  });

  it("rôle ADMIN global : projette le niveau écriture (CONTRIBUTOR), pas la gestion des signalements", async () => {
    // Admin global (rôle ADMIN, sans scope), sans acteur sur l'app : seul le rôle
    // projeté s'applique et vaut le niveau écriture — comportement historique.
    const { service } = makeService([]);
    const user = { ...baseUser(), role: Roles.ADMIN };

    expect(await service.can([Permission.AppWrite], user, "app-1")).toBe(true);
    expect(await service.can([Permission.ReportManage], user, "app-1")).toBe(
      false,
    );
  });
});
