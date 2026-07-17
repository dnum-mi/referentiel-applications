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

/** Un acteur (par email) rattaché à un type d'acteur `isAdmin` ou non, avec la matrice lecture seule. */
const emailActor = (isAdmin: boolean) => ({
  actorType: { isAdmin, appPermissions: [READ_ONLY_MATRIX] },
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
  it("acteur d'un type ADMIN : droits complets read+write sur l'application, même si la matrice est en lecture seule", async () => {
    const { service } = makeService([emailActor(true)]);
    const user = baseUser();

    // Écriture forcée malgré la matrice read-only.
    expect(await service.can([Permission.AppWrite], user, "app-1")).toBe(true);
    expect(await service.can([Permission.ActorWrite], user, "app-1")).toBe(
      true,
    );
    expect(await service.can([Permission.ComplianceWrite], user, "app-1")).toBe(
      true,
    );
    // Signalements complets (absents du niveau « write » classique).
    expect(await service.can([Permission.ReportManage], user, "app-1")).toBe(
      true,
    );
  });

  it("acteur d'un type NON admin : conserve exactement les droits de la matrice (lecture seule)", async () => {
    const { service } = makeService([emailActor(false)]);
    const user = baseUser();

    // Lecture accordée par la matrice.
    expect(await service.can([Permission.AppRead], user, "app-1")).toBe(true);
    // Écriture refusée : la matrice ne l'accorde pas, pas de court-circuit admin.
    expect(await service.can([Permission.AppWrite], user, "app-1")).toBe(false);
    expect(await service.can([Permission.ActorWrite], user, "app-1")).toBe(
      false,
    );
    expect(await service.can([Permission.ReportManage], user, "app-1")).toBe(
      false,
    );
  });

  it("droits admin bornés à l'application concernée (aucun acteur admin sur une autre app → pas d'écriture)", async () => {
    // La requête d'acteurs est filtrée par applicationId : ici aucun acteur trouvé
    // pour l'app cible → aucun droit applicatif, y compris pour un utilisateur qui
    // serait admin d'une AUTRE application.
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

  it("découplage des 3 niveaux : le rôle ADMIN global projette l'écriture, pas le jeu « admin d'application » complet", async () => {
    // Admin global (rôle ADMIN, sans scope), sans acteur sur l'app : seul le rôle projeté
    // s'applique. Il vaut le niveau écriture (CONTRIBUTOR), pas les droits réservés à
    // l'acteur admin de l'app (ex. gestion des signalements). Empêche qu'un admin global
    // devienne « admin complet de chaque application » par son seul rôle.
    const { service } = makeService([]);
    const user = { ...baseUser(), role: Roles.ADMIN };

    expect(await service.can([Permission.AppWrite], user, "app-1")).toBe(true);
    expect(await service.can([Permission.ReportManage], user, "app-1")).toBe(
      false,
    );
  });
});
