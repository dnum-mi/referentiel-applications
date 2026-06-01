import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, Roles, User } from "@prisma/client";
import { PaginatedResponseDto } from "src/common/dto";
import { OrganizationMaiaReferencesService } from "src/organization-maia-references/organization-maia-references.service";
import { PrismaService } from "src/prisma/prisma.service";
import { UserFilterDto } from "./dto/filters.dto";
import { SyncOrganizationsDto } from "./dto/sync-organizations.dto";
import { UpdateUserDto, UpdateUserPreferencesDto } from "./dto/update-user.dto";
import { Requestor, UserEntity } from "./entities/user.entity";
import { getOrganizationPathFromMaia } from "./utils/maia.tools";
import { UserPermissionLogService } from "./user-permission-log.service";

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userPermissionLogService: UserPermissionLogService,
    private readonly organizationMaiaReferencesService: OrganizationMaiaReferencesService,
  ) {}

  async findOrCreateByEmail(email: string): Promise<UserEntity | null> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      include: {
        organization: true,
        followedApplications: true,
      },
    });

    if (existingUser) {
      return existingUser;
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        role: Roles.VISITOR,
      },
      include: {
        organization: true,
        followedApplications: true,
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
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto, requestor: Requestor) {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...updateUserDto,
        additionalPermissions: [
          ...new Set(updateUserDto.additionalPermissions || []),
        ],
      },
    });

    await this.userPermissionLogService.log(user, requestor);
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
      },
      orderBy,
      page: filters.page,
      pageSize: filters.pageSize,
    });
  }

  getCurrentUser(requestor: UserEntity): UserEntity {
    return requestor;
  }

  async syncOrganizationFromMaia(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException("Utilisateur non trouvé");
    }

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
      data: {
        organizationId: organization.id,
      },
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
