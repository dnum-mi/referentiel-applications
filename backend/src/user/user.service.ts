import { Injectable } from "@nestjs/common";
import { Prisma, User } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserFilterDto } from "./dto/filters.dto";
import { AdminLevel, Requestor, UserEntity } from "./entities/user.entity";
import { paginate } from "src/common/utils/pagination.utils";
import { PaginatedResponseDto } from "src/common/dto";

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findOrCreateByEmail(
    email: string,
    keycloakId: string,
  ): Promise<UserEntity | null> {
    // Check if a user exists with the given keycloakId
    const existingUserByKeycloakId = await this.prisma.user.findUnique({
      where: { keycloakId },
      include: {
        organization: true,
      },
    });

    if (existingUserByKeycloakId) {
      return existingUserByKeycloakId; // Return the user if found by keycloakId
    }

    // Check if a user exists with the given email
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email },
      include: {
        organization: true,
      },
    });

    if (existingUserByEmail) {
      // Update the keycloakId for the existing user
      return this.prisma.user.update({
        where: { email },
        data: { keycloakId },
        include: {
          organization: true,
        },
      });
    }

    // If no user exists, create a new one
    return this.prisma.user.create({
      data: {
        email,
        keycloakId,
        adminLevel: 0, // Default admin level
        capabilities: [],
      },
      include: {
        organization: true,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...updateUserDto,
        capabilities: [...new Set(updateUserDto.capabilities || [])], // Ensure capabilities are unique
      },
    });
  }

  async findAll(filters: UserFilterDto, requestor: Requestor): Promise<PaginatedResponseDto<User>> {
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
          keycloakId: {
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

    return new PaginatedResponseDto(
      await this.prisma.user.findMany({
        where,
        include: {
          organization: true,
        },
        orderBy,
        ...paginate(filters.page, filters.pageSize),
        omit: {
          capabilities: requestor.adminLevel < AdminLevel.ADMIN, // Only admins can see user capabilities
        },
      }),
      await this.prisma.user.count({ where }),
    );
  }

  getCurrentUser(requestor: UserEntity): UserEntity {
    return requestor;
  }
}
