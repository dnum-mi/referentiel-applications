import { Injectable } from "@nestjs/common";
import type { Prisma, User } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserFilterDto } from "./dto/filters.dto";
import { UserEntity, UserType } from "./entities/user.entity";

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
    });

    if (existingUserByKeycloakId) {
      return existingUserByKeycloakId; // Return the user if found by keycloakId
    }

    // Check if a user exists with the given email
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUserByEmail) {
      // Update the keycloakId for the existing user
      return this.prisma.user.update({
        where: { email },
        data: { keycloakId },
      });
    }

    // If no user exists, create a new one
    return this.prisma.user.create({
      data: {
        email,
        keycloakId,
        adminLevel: 0, // Default admin level
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { keycloakId: id },
      data: updateUserDto,
    });
  }

  async findAll(filters: UserFilterDto): Promise<User[]> {
    const where: Prisma.UserWhereInput = {};

    if (filters.type) {
      where.type = { in: filters.type };
    } else {
      where.type = UserType.human;
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
          keycloakId: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
      ];
    }

    const pageNumberInput = (filters as any).page ?? (filters as any).pageNumber ?? 1;
    const itemsPerPageInput = (filters as any).limit ?? (filters as any).itemsPerPage ?? 10;

    const pageNumber = Number.isFinite(Number(pageNumberInput)) && Number(pageNumberInput) > 0
      ? Number(pageNumberInput)
      : 1;
    const itemsPerPage = Number.isFinite(Number(itemsPerPageInput)) && Number(itemsPerPageInput) > 0
      ? Math.min(Number(itemsPerPageInput), 100)
      : 10;

    const skipCount = (pageNumber - 1) * itemsPerPage;

    const sortColumnFromClient = (filters as any).sortBy
      ?? (filters as any).sortedBy
      ?? (filters as any).sortColumn
      ?? "email";

    const isSortDescending = (filters as any).isSortDescending ?? (filters as any).sortedDesc;
    const sortOrderFromClient = (filters as any).sortOrder as string | undefined;

    let sortDirection: Prisma.SortOrder;
    if (typeof isSortDescending === "boolean") {
      sortDirection = isSortDescending ? "desc" : "asc";
    } else {
      sortDirection = sortOrderFromClient?.toLowerCase() === "desc" ? "desc" : "asc";
    }

    const allowedSortColumns = new Set<keyof Prisma.UserOrderByWithRelationInput>([
      "email",
      "keycloakId",
      "lastLogin",
      "adminLevel",
    ]);

    let sortColumn: keyof Prisma.UserOrderByWithRelationInput;
    if (allowedSortColumns.has(sortColumnFromClient)) {
      sortColumn = sortColumnFromClient as keyof Prisma.UserOrderByWithRelationInput;
    } else {
      sortColumn = "email";
    }
    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [sortColumn]: sortDirection,
    };

    return this.prisma.user.findMany({
      where,
      orderBy,
      skip: skipCount,
      take: itemsPerPage,
    });
  }

  getCurrentUser(requestor: UserEntity): UserEntity {
    return requestor;
  }
}
