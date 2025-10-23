import type { Prisma } from "@prisma/client";
import type { CreateTokenParams, ITokenRepository, ListTokensParams, UpdateTokenParams } from "./token.repository.interface";
import { Injectable } from "@nestjs/common";
import { UserType } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { stringToSlug } from "src/utils/functions";
import { TokenStatus } from "../domain/token-status.entity";
import { TokenEntity } from "../domain/token.entity";

@Injectable()
export class TokenRepository implements ITokenRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async list({
    createdById,
  }: ListTokensParams) {
    const where: Prisma.TokenWhereInput = {
      status: {
        not: "revoked",
      },
    };
    if (createdById) {
      where.createdById = createdById;
    }
    return this.prisma.token.findMany({
      where,
      include: {
        createdBy: true,
        userImpersonate: true,
      },
      omit: { hash: true },
    });
  }

  async create({
    createdById,
    name,
    description,
    expiresAt,
    adminLevel,
    userIdImpersonate,
    hash,
  }: CreateTokenParams) {
    if (!userIdImpersonate) {
      const nameSlug = stringToSlug(name);
      const user = await this.prisma.user.create({
        data: {
          email: `${nameSlug}-${Date.now()}@bot.internal`,
          adminLevel: adminLevel || 0,
          type: UserType.bot,
        },
      });
      userIdImpersonate = user.id;
    }

    return this.prisma.token.create({
      data: {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById,
        name,
        description,
        expiresAt,
        adminLevel,
        userIdImpersonate,
        status: TokenStatus.active,
        hash,
      },
      include: {
        createdBy: true,
        userImpersonate: true,
      },
      omit: { hash: true },
    });
  }

  async getByHash(hash: string): Promise<TokenEntity | undefined> {
    return this.prisma.token.findUnique({
      where: { hash },
      include: {
        createdBy: true,
        userImpersonate: true,
      },
      omit: { hash: true },
    });
  }

  async getById(id: string) {
    return this.prisma.token.findUnique({
      where: { id },
      include: {
        createdBy: true,
        userImpersonate: true,
      },
      omit: { hash: true },
    });
  }

  async update(id: string, data: UpdateTokenParams): Promise<TokenEntity> {
    return this.prisma.token.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        createdBy: true,
        userImpersonate: true,
      },
      omit: {
        hash: true,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.token.delete({
      where: { id },
    });
  }
}
