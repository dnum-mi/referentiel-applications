import { ForbiddenException } from "@nestjs/common";
import { Permission, Roles } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { CheckPermissions } from "src/common/service/check-permissions.service";
import { QueryBuilderGroupActor } from "src/common/service/prisma-query-builder.service";
import { organizationWithinScope } from "src/common/utils/organization-scope.utils";
import type { APP_PERMISSIONS } from "src/common/utils/types";
import type { OrganizationDto } from "src/organizations/dto/organizations.dto";
import type { PrismaService } from "src/prisma/prisma.service";
import type { Requestor } from "src/user/entities/user.entity";
import {
  DELEGATED_AUTH,
  delegateToService,
  globalPermissions,
} from "./delegated-auth";
import { principalToPermissions } from "./role-to-permissions";

function organization(path: string): OrganizationDto {
  return {
    id: `organization-${path}`,
    path,
    url: null,
    sigle: null,
    parentId: null,
    businessDivisionId: null,
  };
}

function human(overrides: Partial<Requestor> = {}): Requestor {
  const user: Requestor = {
    id: "human-id",
    email: "human@example.test",
    type: "human",
    role: Roles.VISITOR,
    organizationId: null,
    organization: null,
    scopeOrganizationId: null,
    scopeOrganization: null,
    isBlocked: false,
    additionalPermissions: [],
    ...overrides,
  };
  return { ...user, permissions: principalToPermissions(user) };
}

function machine(overrides: Partial<Requestor> = {}): Requestor {
  return human({
    id: "service-id",
    email: "service@bot.internal",
    type: "bot",
    ...overrides,
  });
}

function scope(path: string): Partial<Requestor> {
  const scopeOrganization = organization(path);
  return { scopeOrganizationId: scopeOrganization.id, scopeOrganization };
}

type ActorSource = "email" | "group" | "default";
type Matrix = Partial<Record<APP_PERMISSIONS, boolean>>;

function makeCheckPermissions({
  actorSource,
  matrix = {},
  matchingScopes = [],
  businessDivisionScopes = [],
}: {
  actorSource?: ActorSource;
  matrix?: Matrix;
  matchingScopes?: string[];
  businessDivisionScopes?: string[];
} = {}) {
  const matchesScope = (filter: unknown, paths: string[]): boolean =>
    paths.some(
      (path) =>
        JSON.stringify(filter) ===
        JSON.stringify(organizationWithinScope(path)),
    );
  const prisma = {
    actor: {
      findMany: jest.fn(async ({ where }: Prisma.ActorFindManyArgs) => {
        if (where?.email) {
          return actorSource === "email"
            ? [{ actorType: { appPermissions: [matrix] } }]
            : [];
        }
        return matchesScope(where?.organization, matchingScopes)
          ? [{ actorTypeId: "scope-actor" }]
          : [];
      }),
    },
    actorType: {
      findMany: jest.fn().mockResolvedValue([{ appPermissions: [matrix] }]),
    },
    appPermissions: {
      findFirst: jest
        .fn()
        .mockResolvedValue(actorSource === "default" ? matrix : null),
    },
    businessDivision: {
      findFirst: jest.fn(
        async ({ where }: Prisma.BusinessDivisionFindFirstArgs) =>
          matchesScope(where?.organizations?.some, businessDivisionScopes)
            ? { id: "business-division" }
            : null,
      ),
    },
    $queryRaw: jest
      .fn()
      .mockResolvedValue(
        actorSource === "group" ? [{ actorTypeId: "group-actor" }] : [],
      ),
  };
  const queryBuilder = new QueryBuilderGroupActor();
  const groupQuery = jest.spyOn(queryBuilder, "buildByApplication");
  const check = new CheckPermissions(
    prisma as unknown as PrismaService,
    queryBuilder,
  );
  return { check, prisma, groupQuery };
}

describe("delegateToService — intersection des identités (#1988)", () => {
  const roles = [Roles.VISITOR, Roles.READER, Roles.CONTRIBUTOR, Roles.ADMIN];
  const roleCases = roles.flatMap((humanRole, humanRank) =>
    roles.map((serviceRole, serviceRank) => ({
      humanRole,
      serviceRole,
      expectedRole: roles[Math.min(humanRank, serviceRank)],
      expectedRank: Math.min(humanRank, serviceRank),
    })),
  );

  it.each(roleCases)(
    "humain $humanRole + service $serviceRole : plafond $expectedRole",
    async ({ humanRole, serviceRole, expectedRole, expectedRank }) => {
      const user = delegateToService(
        human({ role: humanRole }),
        machine({ role: serviceRole }),
      );
      const { check } = makeCheckPermissions();

      expect(user.role).toBe(expectedRole);
      expect(user.id).toBe("human-id");
      expect(user.type).toBe("human");
      expect(await check.can([Permission.AppList], user)).toBe(true);
      expect(await check.can([Permission.ColumnRead], user)).toBe(
        expectedRank >= 1,
      );
      expect(await check.can([Permission.CreateApplication], user)).toBe(
        expectedRank >= 2,
      );
      expect(await check.can([Permission.GlobalAdminManage], user)).toBe(
        expectedRank === 3,
      );
      expect(await check.can([Permission.TechnologyRead], user, "app-id")).toBe(
        expectedRank >= 1,
      );
      expect(await check.can([Permission.ActorWrite], user, "app-id")).toBe(
        expectedRank >= 2,
      );
    },
  );

  it("conserve seulement les délégations communes, même si elles dépassent le rôle VISITOR", async () => {
    const user = delegateToService(
      human({
        additionalPermissions: [
          Permission.QualityCampaignManage,
          Permission.QualityCampaignManage,
          Permission.DataExport,
        ],
      }),
      machine({
        additionalPermissions: [
          Permission.QualityCampaignManage,
          Permission.MditCampaignManage,
        ],
      }),
    );
    const { check } = makeCheckPermissions();

    expect(user.additionalPermissions).toEqual([
      Permission.QualityCampaignManage,
    ]);
    expect(await check.can([Permission.QualityCampaignManage], user)).toBe(
      true,
    );
    expect(await check.can([Permission.DataExport], user)).toBe(false);
    expect(await check.can([Permission.MditCampaignManage], user)).toBe(false);
  });

  it("croise une délégation humaine avec une permission de rôle du service", async () => {
    const user = delegateToService(
      human({ additionalPermissions: [Permission.DataExport] }),
      machine({ role: Roles.ADMIN }),
    );
    const { check } = makeCheckPermissions();

    expect(user.role).toBe(Roles.VISITOR);
    expect(await check.can([Permission.DataExport], user)).toBe(true);
    expect(await check.can([Permission.AdminPanelManage], user)).toBe(false);
  });

  it("ne confond pas deux permissions globales distinctes dans une condition OU", async () => {
    const person = human({ additionalPermissions: [Permission.DataExport] });
    const service = machine({ role: Roles.READER });
    const required = [Permission.DataExport, Permission.MDITList];
    const { check } = makeCheckPermissions();

    expect(await check.can(required, person)).toBe(true);
    expect(await check.can(required, service)).toBe(true);
    expect(await check.can(required, delegateToService(person, service))).toBe(
      false,
    );
  });

  it("garde le contexte interne après copie, sans exposer le service dans JSON", () => {
    const person = human({ role: Roles.ADMIN, ...scope("/MI") });
    const service = machine({ role: Roles.READER, ...scope("/MI/DNUM") });
    const personBefore = JSON.stringify(person);
    const serviceBefore = JSON.stringify(service);
    const user = delegateToService(person, service);

    expect(user[DELEGATED_AUTH]?.human.role).toBe(Roles.ADMIN);
    expect(user[DELEGATED_AUTH]?.human.scopeOrganization?.path).toBe("/MI");
    expect(user[DELEGATED_AUTH]?.service.id).toBe(service.id);
    expect({ ...user }[DELEGATED_AUTH]).toBe(user[DELEGATED_AUTH]);
    expect(JSON.stringify(user)).not.toContain(service.id);
    expect(JSON.stringify(user)).not.toContain(service.email);
    expect(JSON.stringify(user)).not.toContain("delegated-auth");
    expect(JSON.stringify(person)).toBe(personBefore);
    expect(JSON.stringify(service)).toBe(serviceBefore);
  });

  it("globalPermissions supporte un principal sans permissions calculées", () => {
    expect(
      globalPermissions({
        ...human(),
        permissions: undefined,
        additionalPermissions: [Permission.DataExport],
      }),
    ).toEqual([Permission.DataExport]);
  });

  it.each([
    [undefined, undefined, null],
    ["/MI", undefined, "/MI"],
    [undefined, "/MI", "/MI"],
    ["/MI", "/MI/DNUM", "/MI/DNUM"],
    ["/MI/DNUM", "/MI", "/MI/DNUM"],
    ["/mi/dnum/", "/MI", "/mi/dnum/"],
    ["/MI/DNUM", "/mi/dnum/", "/MI/DNUM"],
  ])(
    "périmètres %s et %s : périmètre effectif %s",
    (humanScope, serviceScope, expectedScope) => {
      const user = delegateToService(
        human({ role: Roles.ADMIN, ...(humanScope ? scope(humanScope) : {}) }),
        machine({
          role: Roles.ADMIN,
          ...(serviceScope ? scope(serviceScope) : {}),
        }),
      );

      expect(user.scopeOrganization?.path ?? null).toBe(expectedScope);
      expect(user.scopeOrganizationId).toBe(
        expectedScope ? organization(expectedScope).id : null,
      );
      expect(
        globalPermissions(user).includes(Permission.GlobalAdminManage),
      ).toBe(expectedScope === null);
    },
  );

  it.each([
    ["/MI/DNUM", "/MI/SG"],
    ["/SG", "/SGAMI"],
    ["/MI/DNUM", "/MI/DNUM-BIS"],
    ["/MI/DNUM", "/AUTRE/MI/DNUM"],
  ])("refuse les périmètres disjoints %s et %s", (humanScope, serviceScope) => {
    expect(() =>
      delegateToService(human(scope(humanScope)), machine(scope(serviceScope))),
    ).toThrow(ForbiddenException);
  });

  it.each(["human", "service"])(
    "refuse un périmètre %s dont la relation manque",
    (principal) => {
      const invalid = {
        scopeOrganizationId: "missing",
        scopeOrganization: null,
      };
      expect(() =>
        delegateToService(
          human(principal === "human" ? invalid : {}),
          machine(principal === "service" ? invalid : {}),
        ),
      ).toThrow(ForbiddenException);
    },
  );
});

describe("CheckPermissions — plafond du service après les acteurs (#1988)", () => {
  const actorSources = ["email", "group", "default"] as const;
  const actorCases = actorSources.flatMap((source) =>
    [Roles.VISITOR, Roles.READER].map((role) => ({ source, role })),
  );

  it.each(actorCases)(
    "acteur $source en écriture et service $role : le plafond reste appliqué",
    async ({ source, role }) => {
      const { check, prisma, groupQuery } = makeCheckPermissions({
        actorSource: source,
        matrix: {
          AppWrite: true,
          ActorRead: true,
          ActorWrite: true,
          TechnologyRead: true,
          TechnologyWrite: true,
        },
      });
      const person = human({
        organizationId: "human-organization",
        organization: organization("/MI/DNUM/TEAM"),
      });
      const user = delegateToService(person, machine({ role }));

      expect(await check.can([Permission.ActorWrite], person, "app-id")).toBe(
        true,
      );
      const appPermissions = await check.resolveAppPermissions("app-id", user);
      expect(appPermissions).not.toContain(Permission.AppWrite);
      expect(appPermissions).not.toContain(Permission.ActorWrite);
      expect(appPermissions).not.toContain(Permission.TechnologyWrite);
      expect(appPermissions.includes(Permission.ActorRead)).toBe(
        role === Roles.READER,
      );
      expect(await check.can([Permission.ActorWrite], user, "app-id")).toBe(
        false,
      );
      expect(await check.can([Permission.ActorWrite], user)).toBe(false);

      const emailQueries = prisma.actor.findMany.mock.calls.filter(
        ([args]) => args.where?.email,
      );
      expect(
        emailQueries.every(([args]) =>
          JSON.stringify(args.where?.email).includes(person.email),
        ),
      ).toBe(true);
      expect(
        groupQuery.mock.calls.every(
          ([, principal]) => principal.id === person.id,
        ),
      ).toBe(true);
    },
  );

  it("un service ADMIN conserve l'écriture légitime d'un acteur VISITOR", async () => {
    const { check } = makeCheckPermissions({
      actorSource: "email",
      matrix: { AppWrite: true, ActorWrite: true },
    });
    const user = delegateToService(human(), machine({ role: Roles.ADMIN }));

    expect(user.role).toBe(Roles.VISITOR);
    expect(await check.can([Permission.ActorWrite], user, "app-id")).toBe(true);
    expect(await check.can([Permission.TechnologyWrite], user, "app-id")).toBe(
      false,
    );
  });

  it("ne joint pas l'écriture d'un acteur humain et une lecture distincte du service", async () => {
    const { check } = makeCheckPermissions({
      actorSource: "email",
      matrix: { AppWritePriority: true },
    });
    const person = human();
    const service = machine({ role: Roles.READER });
    const required = [Permission.AppWritePriority, Permission.HostingRead];

    expect(await check.can(required, person, "app-id")).toBe(true);
    expect(await check.can([Permission.HostingRead], service, "app-id")).toBe(
      true,
    );
    expect(
      await check.can(required, delegateToService(person, service), "app-id"),
    ).toBe(false);
  });

  it.each(["human", "service"])(
    "le périmètre %s reste opposable même lorsque l'autre principal est global",
    async (scopedPrincipal) => {
      const { check, prisma } = makeCheckPermissions();
      const user = delegateToService(
        human({
          role: Roles.ADMIN,
          ...(scopedPrincipal === "human" ? scope("/MI/DNUM") : {}),
        }),
        machine({
          role: Roles.ADMIN,
          ...(scopedPrincipal === "service" ? scope("/MI/DNUM") : {}),
        }),
      );

      expect(
        await check.can([Permission.ActorWrite], user, "outside-app"),
      ).toBe(false);
      expect(prisma.actor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            applicationId: "outside-app",
            organization: organizationWithinScope("/MI/DNUM"),
          },
        }),
      );
    },
  );

  it("résout les deux périmètres d'origine sans remplacer celui de l'humain", async () => {
    const { check, prisma } = makeCheckPermissions({ matchingScopes: ["/MI"] });
    const user = delegateToService(
      human({ role: Roles.ADMIN, ...scope("/MI") }),
      machine({ role: Roles.ADMIN, ...scope("/MI/DNUM") }),
    );

    expect(
      await check.can([Permission.ActorWrite], user, "outside-service"),
    ).toBe(false);
    for (const path of ["/MI", "/MI/DNUM"]) {
      expect(prisma.actor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            applicationId: "outside-service",
            organization: organizationWithinScope(path),
          },
        }),
      );
    }
  });

  it("accepte une application couverte par acteur pour l'humain et direction métier pour le service", async () => {
    const { check } = makeCheckPermissions({
      matchingScopes: ["/MI"],
      businessDivisionScopes: ["/MI/DNUM"],
    });
    const user = delegateToService(
      human({ role: Roles.ADMIN, ...scope("/MI") }),
      machine({ role: Roles.ADMIN, ...scope("/MI/DNUM") }),
    );

    expect(await check.can([Permission.ActorWrite], user, "covered-app")).toBe(
      true,
    );
  });
});
