import { Injectable } from "@nestjs/common";
import type { Prisma, User } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserFilterDto } from "./dto/filters.dto";

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findUserByKeycloakId(keycloakId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { keycloakId },
    });
  }

  async findOrCreateByEmail(
    email: string,
    keycloakId: string,
  ): Promise<User | null> {
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

    return this.prisma.user.findMany({
      where,
      orderBy: {
        email: "asc",
      },
    });
  }
}
