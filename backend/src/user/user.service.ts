import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Roles, UserType } from "@prisma/client";
import { PaginatedResponseDto } from "src/common/dto";
import { OrganizationMaiaReferencesService } from "src/organization-maia-references/organization-maia-references.service";
import { PrismaService } from "src/prisma/prisma.service";
import { UserFilterDto } from "./dto/filters.dto";
import { SyncOrganizationsDto } from "./dto/sync-organizations.dto";
import { UpdateUserDto, UpdateUserPreferencesDto } from "./dto/update-user.dto";
import { Requestor, UserEntity } from "./entities/user.entity";
import {
  getFullNameFromMaia,
  getOrganizationPathFromMaia,
} from "./utils/maia.tools";
import { ScopedPermissionService } from "./scope-permission/scoped-permission.service";
import { UserPermissionLogService } from "./user-permission-log.service";
import { LoggerService } from "src/logger/logger.service";
import { EmailService } from "src/email/email.service";

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userPermissionLogService: UserPermissionLogService,
    private readonly organizationMaiaReferencesService: OrganizationMaiaReferencesService,
    private readonly scopedPermissionService: ScopedPermissionService,
    private readonly logger: LoggerService,
    private readonly emailService: EmailService,
  ) {}

  async findOrCreateByEmail(email: string): Promise<UserEntity | null> {
    const existingUser = await this.findByEmailWithRelations(email);

    if (existingUser) {
      return existingUser;
    }

    return this.createUser(email);
  }

  findByEmailWithRelations(email: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        organization: true,
        followedApplications: true,
        scopeOrganization: true,
      },
    });
  }

  async createUser(email: string) {
    const organizationPath = await getOrganizationPathFromMaia(email);
    const data: Prisma.UserCreateArgs["data"] = {
      email,
      role: Roles.VISITOR,
    };

    if (organizationPath) {
      const { organization } =
        await this.findOrCreateOrganizationFromPath(organizationPath);
      data.organizationId = organization.id;
    }

    const user = await this.prisma.user.create({
      data,
      include: {
        organization: true,
        followedApplications: true,
        scopeOrganization: true,
      },
    });

    await this.userPermissionLogService.log(user);
    return user;
  }

  async subscribe(userId: string, applicationId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        followedApplications: {
          connect: { id: applicationId },
        },
      },
      include: {
        organization: true,
        followedApplications: true,
        scopeOrganization: true,
      },
    });
  }

  async unsubscribe(userId: string, applicationId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        followedApplications: {
          disconnect: { id: applicationId },
        },
      },
      include: {
        organization: true,
        followedApplications: true,
        scopeOrganization: true,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto, requestor: Requestor) {
    await this.scopedPermissionService.assertCanUpdate(
      id,
      updateUserDto,
      requestor,
    );

    this.logger.log(
      `[AdminPanel] Début mise à jour utilisateur ${id} par ${requestor.id} - changes: ${JSON.stringify({ role: updateUserDto.role, organizationId: updateUserDto.organizationId, scopeOrganizationId: updateUserDto.scopeOrganizationId, additionalPermissions: updateUserDto.additionalPermissions })}`,
    );

    const previousUser = await this.prisma.user.findUnique({
      where: { id },
      include: { organization: true },
    });

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        role: updateUserDto.role,
        organizationId: updateUserDto.organizationId,
        scopeOrganizationId: updateUserDto.scopeOrganizationId,
        additionalPermissions: [
          ...new Set(updateUserDto.additionalPermissions || []),
        ],
      },
      include: { organization: true },
    });

    await this.userPermissionLogService.log(user, requestor);

    this.logger.log(
      `[AdminPanel] Utilisateur ${id} mis à jour avec succès par ${requestor.id}`,
    );

    const organizationChanged =
      previousUser?.organizationId !== updateUserDto.organizationId;

    if (organizationChanged && user.email) {
      const newOrg = user.organization;
      await this.emailService.sendUserOrganizationChangedNotification({
        to: user.email,
        userEmail: user.email,
        oldOrganization: previousUser?.organization?.path ?? null,
        newOrganization: newOrg?.path ?? null,
      });
    }

    const roleChanged = previousUser?.role !== user.role;
    const permissionsChanged =
      JSON.stringify(
        [...(previousUser?.additionalPermissions ?? [])].sort(),
      ) !== JSON.stringify([...user.additionalPermissions].sort());

    if ((roleChanged || permissionsChanged) && user.email) {
      await this.emailService.sendUserPermissionsChangedNotification({
        to: user.email,
        userEmail: user.email,
        role: user.role,
        additionalPermissions: user.additionalPermissions,
        changedByEmail: requestor.email ?? null,
      });
    }

    return user;
  }

  async block(id: string, requestor: Requestor) {
    if (id === requestor.id) {
      throw new BadRequestException(
        "Vous ne pouvez pas bloquer votre propre accès.",
      );
    }

    await this.scopedPermissionService.assertCanBlock(id, requestor);

    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) {
      throw new NotFoundException("Utilisateur introuvable");
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        isBlocked: true,
        blockedAt: new Date(),
        blockedById: requestor.id,
      },
      include: { organization: true },
    });

    this.logger.warn(
      `[AdminPanel] Utilisateur ${id} bloqué par ${requestor.id}`,
    );

    if (user.email) {
      await this.emailService.sendUserBlockedNotification({
        to: user.email,
        userEmail: user.email,
        changedByEmail: requestor.email ?? null,
      });
    }

    return user;
  }

  async unblock(id: string, requestor: Requestor) {
    await this.scopedPermissionService.assertCanBlock(id, requestor);

    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) {
      throw new NotFoundException("Utilisateur introuvable");
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        isBlocked: false,
        blockedAt: null,
        blockedById: null,
      },
      include: { organization: true },
    });

    this.logger.warn(
      `[AdminPanel] Utilisateur ${id} débloqué par ${requestor.id}`,
    );

    if (user.email) {
      await this.emailService.sendUserUnblockedNotification({
        to: user.email,
        userEmail: user.email,
        changedByEmail: requestor.email ?? null,
      });
    }

    return user;
  }

  async updateOwnPreferences(
    id: string,
    updateUserPreferencesDto: UpdateUserPreferencesDto,
  ) {
    return this.prisma.user.update({
      where: { id },
      data: {
        emailNotificationsEnabled:
          updateUserPreferencesDto.emailNotificationsEnabled,
      },
    });
  }

  async findAll(
    filters: UserFilterDto,
    requestor: Requestor,
  ): Promise<PaginatedResponseDto<UserEntity>> {
    const where: Prisma.UserWhereInput = {};

    where.type = { in: filters.type };

    const requestorScopePath = requestor.scopeOrganization?.path;
    if (requestorScopePath) {
      where.organization = {
        path: { startsWith: requestorScopePath },
      };
    }

    if (filters.search) {
      where.OR = [
        {
          email: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
        {
          organization: {
            path: {
              contains: filters.search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    let orderBy: Prisma.UserOrderByWithRelationInput = {};

    if (filters.sortBy === "organisation") {
      orderBy = {
        organization: {
          path: filters.order || "asc",
        },
      };
    } else {
      const sortField = filters.sortBy || "email";
      const order = filters.order ?? "asc";
      // lastPermissionChangeAt est nullable (jamais modifié) : Prisma n'accepte la forme
      // { sort, nulls } que pour les champs nullables, d'où le cas particulier ici.
      orderBy =
        sortField === "lastPermissionChangeAt"
          ? { [sortField]: { sort: order, nulls: "last" } }
          : { [sortField]: order };
    }

    const paginated = await this.prisma.user.paginate({
      where,
      include: {
        organization: true,
        scopeOrganization: true,
      },
      orderBy,
      page: filters.page,
      pageSize: filters.pageSize,
    });

    const lastChangedByIds = [
      ...new Set(
        paginated.results
          .map((user) => user.lastPermissionChangedById)
          .filter((id): id is string => id !== null),
      ),
    ];
    const lastChangedByUsers = lastChangedByIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: lastChangedByIds } },
          select: { id: true, email: true },
        })
      : [];
    const emailById = new Map(
      lastChangedByUsers.map((user) => [user.id, user.email]),
    );

    return {
      ...paginated,
      results: paginated.results.map((user) => ({
        ...user,
        lastPermissionChangedByEmail: user.lastPermissionChangedById
          ? (emailById.get(user.lastPermissionChangedById) ?? null)
          : null,
      })),
    };
  }

  getCurrentUser(requestor: UserEntity): UserEntity {
    return requestor;
  }

  findPermissionLogs(userId: string) {
    return this.userPermissionLogService.findAllForUser(userId);
  }

  findByIdWithRelations(id: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        organization: true,
        followedApplications: true,
        scopeOrganization: true,
      },
    });
  }

  async startImpersonation(
    admin: Requestor,
    targetId: string,
  ): Promise<UserEntity> {
    if (admin.id === targetId) {
      throw new BadRequestException("Vous ne pouvez pas vous impersonner.");
    }

    const target = await this.findByIdWithRelations(targetId);
    if (!target) {
      throw new NotFoundException("Utilisateur introuvable");
    }
    if (target.type === UserType.bot) {
      throw new BadRequestException(
        "Impossible d'impersonner un compte de service.",
      );
    }
    if (target.isBlocked) {
      throw new BadRequestException(
        "Impossible d'impersonner un utilisateur bloqué.",
      );
    }

    // Un admin scopé ne peut impersonner que dans son périmètre (#2217).
    await this.scopedPermissionService.assertCanImpersonate(targetId, admin);

    await this.prisma.impersonationLog.create({
      data: { adminId: admin.id, targetId },
    });

    this.logger.warn(
      `[Impersonation] ${admin.email} (admin ${admin.id}) impersonne ${target.email} (${target.id})`,
    );

    return target;
  }

  async stopImpersonation(adminId: string, targetId: string): Promise<void> {
    const openLog = await this.prisma.impersonationLog.findFirst({
      where: { adminId, targetId, endedAt: null },
      orderBy: { startedAt: "desc" },
    });

    if (openLog) {
      await this.prisma.impersonationLog.update({
        where: { id: openLog.id },
        data: { endedAt: new Date() },
      });
    }

    this.logger.warn(
      `[Impersonation] Fin de l'impersonation de ${targetId} par l'admin ${adminId}`,
    );
  }

  async syncOrganizationFromMaiaByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new NotFoundException("Utilisateur non trouvé");
    }

    const [organizationPath, { lastName, firstName, fullName }] =
      await Promise.all([
        getOrganizationPathFromMaia(email),
        getFullNameFromMaia(email),
      ]);

    let organizationId: string | null = null;
    if (organizationPath) {
      const { organization } =
        await this.findOrCreateOrganizationFromPath(organizationPath);
      organizationId = organization.id;
    }

    return { organizationId, organizationPath, lastName, firstName, fullName };
  }

  async syncOrganizationFromMaia(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new NotFoundException("Utilisateur non trouvé");
    }

    return this.syncOrganizationFromMaiaForUser(user);
  }

  private async syncOrganizationFromMaiaForUser(user: {
    id: string;
    email: string;
  }) {
    const organizationPath = await getOrganizationPathFromMaia(user.email);

    if (!organizationPath) {
      throw new NotFoundException(
        "Aucune organisation trouvée dans MAIA pour cet utilisateur.",
      );
    }

    const { organization } =
      await this.findOrCreateOrganizationFromPath(organizationPath);

    return this.prisma.user.update({
      where: { id: user.id },
      data: { organizationId: organization.id },
    });
  }

  async syncOrganizationsFromMaia(dto: SyncOrganizationsDto): Promise<void> {
    const onlyMissing = dto.onlyMissing ?? true;

    const users = await this.prisma.user.findMany({
      where: onlyMissing ? { organizationId: null } : undefined,
      select: {
        id: true,
        email: true,
      },
      orderBy: { id: "asc" },
    });

    for (const user of users) {
      const organizationPath = await getOrganizationPathFromMaia(user.email);

      if (!organizationPath) {
        continue;
      }

      const { organization } =
        await this.findOrCreateOrganizationFromPath(organizationPath);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { organizationId: organization.id },
      });
    }
  }

  startSyncOrganizationsFromMaiaInBackground(dto: SyncOrganizationsDto) {
    const onlyMissing = dto.onlyMissing ?? true;

    void this.syncOrganizationsFromMaia({ onlyMissing }).catch(() => undefined);

    return {
      status: "queued" as const,
      message: "Tâche de synchronisation MAIA lancée.",
    };
  }

  private async findOrCreateOrganizationFromPath(path: string) {
    // 1. Lookup prioritaire via la table des overrides MAIA
    const orgFromOverride =
      await this.organizationMaiaReferencesService.findOrganizationByMaiaRef(
        path,
      );
    if (orgFromOverride) {
      return { organization: orgFromOverride, created: false };
    }

    // 2. Sinon on utilise le path tel quel
    const existingOrg = await this.prisma.organization.findFirst({
      where: { path },
      select: { id: true },
    });
    if (existingOrg) {
      return {
        organization: existingOrg,
        created: false,
      };
    }

    const newOrg = await this.prisma.organization.create({
      data: {
        path,
      },
      select: { id: true },
    });
    return { organization: newOrg, created: true };
  }
}
