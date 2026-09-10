import { Permission, Roles } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { Requestor } from "src/user/entities/user.entity";
import { READ_APP_PERMISSIONS } from "src/permissions/role-to-permissions";
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

type MakeServiceOptions = {
  /** Résultat du canal email (`getUserAppPermissions`). */
  emailActors?: unknown[];
  /** Résultat du canal "acteur dans le scope" (`getUserRolePermissions`). */
  scopeActors?: unknown[];
  /** Direction métier retournée par `hasBusinessDivisionScope`. */
  businessDivision?: unknown | null;
  /** Matrice du type d'acteur par défaut (`getDefaultActorTypePermissions`). */
  defaultActorTypePermissions?: unknown | null;
};

const makeService = ({
  emailActors = [],
  scopeActors = [],
  businessDivision = null,
  defaultActorTypePermissions = null,
}: MakeServiceOptions = {}) => {
  const prisma = {
    actor: {
      // Les deux canaux (email / organisation de scope) appellent tous les
      // deux `actor.findMany` : on les distingue par la forme du `where`.
      findMany: jest
        .fn()
        .mockImplementation(({ where }: { where?: { email?: string } }) =>
          Promise.resolve(where?.email ? emailActors : scopeActors),
        ),
    },
    actorType: { findMany: jest.fn().mockResolvedValue([]) },
    appPermissions: {
      findFirst: jest.fn().mockResolvedValue(defaultActorTypePermissions),
    },
    businessDivision: {
      findFirst: jest.fn().mockResolvedValue(businessDivision),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  const queryBuilder = {
    buildByApplication: jest.fn().mockReturnValue([] as unknown),
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
    const { service } = makeService({ emailActors: [emailActor()] });
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

  it("droits bornés à l'application concernée (aucun acteur sur l'app cible, pas de type d'acteur par défaut → aucun droit applicatif)", async () => {
    // La requête d'acteurs est filtrée par applicationId : ici aucun acteur trouvé
    // pour l'app cible → aucun droit applicatif, même si l'utilisateur est acteur
    // d'une AUTRE application.
    const { service, prisma } = makeService();
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

  it("aucun acteur trouvé : hérite des droits du type d'acteur par défaut (isDefault)", async () => {
    const { service } = makeService({
      defaultActorTypePermissions: READ_ONLY_MATRIX,
    });
    const user = baseUser();

    // Le fallback applique la matrice du type d'acteur par défaut, comme un acteur normal.
    expect(await service.can([Permission.AppRead], user, "app-1")).toBe(true);
    expect(await service.can([Permission.AppWrite], user, "app-1")).toBe(false);
  });

  it("rôle ADMIN global : projette le niveau écriture (CONTRIBUTOR), pas la gestion des signalements", async () => {
    // Admin global (rôle ADMIN, sans scope), sans acteur sur l'app : seul le rôle
    // projeté s'applique et vaut le niveau écriture — comportement historique.
    const { service } = makeService();
    const user = { ...baseUser(), role: Roles.ADMIN };

    expect(await service.can([Permission.AppWrite], user, "app-1")).toBe(true);
    expect(await service.can([Permission.ReportManage], user, "app-1")).toBe(
      false,
    );
  });
});

describe("CheckPermissions.getUserRolePermissions (scope administratif)", () => {
  const scopedAdmin = (path: string): Requestor =>
    ({
      ...baseUser(),
      role: Roles.ADMIN,
      scopeOrganization: { path },
    }) as unknown as Requestor;

  it("scope qui matche un acteur de l'application : rôle projeté accordé, et le prédicat d'organisation est ancré (préfixe, pas sous-chaîne — #2370)", async () => {
    const { service, prisma } = makeService({
      scopeActors: [{ actorTypeId: "at-1" }],
    });
    const user = scopedAdmin("TOTO/TUTU");

    expect(await service.can([Permission.AppWrite], user, "app-1")).toBe(true);
    expect(prisma.businessDivision.findFirst).not.toHaveBeenCalled();
    // La recherche d'acteur dans le périmètre borne l'organisation au scope exact ou à un de ses
    // descendants (`scope + "/"`), jamais à une organisation qui contient seulement le scope en
    // sous-chaîne (`TOTO/TUTU-BIS`, `AUTRE/TOTO/TUTU`).
    expect(prisma.actor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organization: {
            OR: [
              { path: { equals: "TOTO/TUTU", mode: "insensitive" } },
              { path: { startsWith: "TOTO/TUTU/", mode: "insensitive" } },
            ],
          },
        }),
      }),
    );
  });

  it("aucun acteur dans le scope, mais une organisation de la direction métier de l'application matche : rôle projeté accordé", async () => {
    const { service, prisma } = makeService({
      businessDivision: {
        id: "bd-1",
        label: "TOTO/TUTU",
        organizations: [{ path: "TOTO/TUTU/TITI" }],
      },
    });
    const user = scopedAdmin("TOTO/TUTU/TITI");

    expect(await service.can([Permission.AppWrite], user, "app-1")).toBe(true);
    expect(prisma.businessDivision.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          applications: { some: { id: "app-1" } },
          organizations: {
            some: {
              OR: [
                { path: { equals: "TOTO/TUTU/TITI", mode: "insensitive" } },
                {
                  path: { startsWith: "TOTO/TUTU/TITI/", mode: "insensitive" },
                },
              ],
            },
          },
        }),
        include: { organizations: true },
      }),
    );
  });

  it("ni acteur ni direction métier dans le périmètre : aucune permission de rôle accordée", async () => {
    const { service } = makeService();
    const user = scopedAdmin("HORS/PERIMETRE");

    expect(await service.can([Permission.AppWrite], user, "app-1")).toBe(false);
    expect(await service.can([Permission.AppRead], user, "app-1")).toBe(false);
  });
});

// #1985 : la couche 3 ne dépend ni du rôle ni du périmètre — sous session faible, un acteur ne
// conserve que les LECTURES sur ses applications, via le seul point de coupe `resolveAppPermissions`.
describe("CheckPermissions.resolveAppPermissions — session rétrogradée (#1985)", () => {
  const WRITE_MATRIX = {
    ...READ_ONLY_MATRIX,
    AppWrite: true,
    ActorWrite: true,
    ReportManage: true,
  };
  const writingActor = () => ({
    actorType: { appPermissions: [WRITE_MATRIX] },
  });
  const downgraded = (): Requestor =>
    ({
      ...baseUser(),
      authLevel: { level: "weak", downgraded: true, reason: "weak-method" },
    }) as unknown as Requestor;

  it("acteur en écriture, session rétrogradée : lectures conservées, écritures retirées", async () => {
    const { service } = makeService({ emailActors: [writingActor()] });
    const user = downgraded();

    const perms = await service.resolveAppPermissions("app-1", user);
    expect(perms).toEqual(expect.arrayContaining(["ActorRead", "DataRead"]));
    for (const write of ["AppWrite", "ActorWrite", "ReportManage"]) {
      expect(perms).not.toContain(write);
    }
    const readOnly: ReadonlySet<string> = READ_APP_PERMISSIONS;
    expect(perms.every((permission) => readOnly.has(permission))).toBe(true);
    expect(await service.can([Permission.ActorRead], user, "app-1")).toBe(true);
    expect(await service.can([Permission.AppWrite], user, "app-1")).toBe(false);
    expect(await service.can([Permission.ActorWrite], user, "app-1")).toBe(
      false,
    );
  });

  it("même acteur, session forte : la matrice s'applique intégralement", async () => {
    const { service } = makeService({ emailActors: [writingActor()] });
    const user = {
      ...baseUser(),
      authLevel: {
        level: "strong",
        downgraded: false,
        reason: "strong-method",
      },
    } as unknown as Requestor;

    expect(await service.can([Permission.AppWrite], user, "app-1")).toBe(true);
  });

  it("mode observe (downgraded=false, niveau faible) : aucune coupe", async () => {
    const { service } = makeService({ emailActors: [writingActor()] });
    const user = {
      ...baseUser(),
      authLevel: { level: "weak", downgraded: false, reason: "weak-method" },
    } as unknown as Requestor;

    expect(await service.can([Permission.AppWrite], user, "app-1")).toBe(true);
  });
});
