import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, Roles, User } from "@prisma/client";
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
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      include: {
        organization: true,
        followedApplications: true,
        scopeOrganization: true,
      },
    });

    if (existingUser) {
      return existingUser;
    }

    return this.createUser(email);
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
  ): Promise<PaginatedResponseDto<User>> {
    const where: Prisma.UserWhereInput = {};

    where.type = { in: filters.type };

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
      orderBy = {
        [sortField]: filters.order ?? "asc",
      };
    }

    return this.prisma.user.paginate({
      where,
      include: {
        organization: true,
        scopeOrganization: true,
      },
      orderBy,
      page: filters.page,
      pageSize: filters.pageSize,
    });
  }

  getCurrentUser(requestor: UserEntity): UserEntity {
    return requestor;
  }

  async syncOrganizationFromMaiaByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException("Utilisateur non trouvé");
    }

    const userFromMaia = await this.syncOrganizationFromMaiaForUser(user);
    const { lastName, firstName, fullName } = await getFullNameFromMaia(email);
    return {
      ...userFromMaia,
      lastName,
      firstName,
      fullName,
    };
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
