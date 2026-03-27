import { Injectable } from "@nestjs/common";
import { Prisma, User } from "@prisma/client";
import { PaginatedResponseDto } from "src/common/dto";
import { PrismaService } from "src/prisma/prisma.service";
import { UserFilterDto } from "./dto/filters.dto";
import { UpdateUserDto, UpdateUserPreferencesDto } from "./dto/update-user.dto";
import { Requestor, UserEntity } from "./entities/user.entity";

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateByEmail(email: string): Promise<UserEntity | null> {
    // Check if a user exists with the given email
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

    // If no user exists, create a new one
    return this.prisma.user.create({
      data: {
        email,
        adminLevel: 0,
      },
      include: {
        organization: true,
        followedApplications: true,
      },
    });
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

  async update(id: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...updateUserDto,
        additionalPermissions: [
          ...new Set(updateUserDto.additionalPermissions || []),
        ], // Ensure additionalPermissions are unique]
      },
    });
  }

  async updateOwnPreferences(
    id: string,
    UpdateUserPreferencesDto: UpdateUserPreferencesDto,
  ) {
    return this.prisma.user.update({
      where: { id },
      data: {
        emailNotificationsEnabled:
          UpdateUserPreferencesDto.emailNotificationsEnabled,
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
}
