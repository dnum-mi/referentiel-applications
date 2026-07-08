import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Permission, Prisma, Roles, UserType } from "@prisma/client";
import { createHash } from "node:crypto";
import { CheckPermissions } from "src/common/service/check-permissions.service";
import { PrismaService } from "src/prisma/prisma.service";
import { Requestor, UserEntity } from "src/user/entities/user.entity";
import { ScopedPermissionService } from "src/user/scope-permission/scoped-permission.service";
import { generateRandomPassword, stringToSlug } from "src/utils/functions";
import { TokenStatus } from "./domain/token-status.entity";
import { NewTokenEntity } from "./domain/token.entity";
import {
  ExposedTokenDto,
  TokenDto,
  TokenKind,
  TokenOwnerDto,
} from "./dto/token.dto";
import {
  isNewTokenInvalid,
  isRequestorAllowedToUpdateToken,
  isTokenInvalid,
} from "./use-cases.ts/token-control.use-case";

const ACTIVE_TOKEN_LIMIT = 5;

const TOKEN_INCLUDE = {
  createdBy: true,
  userImpersonate: { include: { scopeOrganization: true } },
} satisfies Prisma.TokenInclude;

@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly checkPermissions: CheckPermissions,
    private readonly scopedPermissionService: ScopedPermissionService,
  ) {}

  async list({ requestor }: { requestor?: Requestor }): Promise<TokenDto[]> {
    const where: Prisma.TokenWhereInput = {
      status: {
        not: "revoked",
      },
    };

    if (requestor?.id) {
      where.createdById = requestor.id;
    }

    const tokens = await this.prisma.token.findMany({
      where,
      include: TOKEN_INCLUDE,
      omit: { hash: true },
    });

    return tokens.map((token) => this.toDto(token));
  }

  async listPaginated({
    kind,
    page,
    pageSize,
  }: {
    kind?: (typeof TokenKind)[keyof typeof TokenKind];
    page?: number;
    pageSize?: number;
  }): Promise<{ results: TokenDto[]; total: number }> {
    const where: Prisma.TokenWhereInput = {
      status: {
        not: "revoked",
      },
    };

    if (kind) {
      where.userImpersonate = {
        type: kind === TokenKind.service ? UserType.bot : UserType.human,
      };
    }

    const [tokens, total] = await Promise.all([
      this.prisma.token.findMany({
        where,
        include: TOKEN_INCLUDE,
        omit: { hash: true },
        orderBy: { createdAt: "desc" },
        ...(pageSize ? { skip: (page ?? 0) * pageSize, take: pageSize } : {}),
      }),
      this.prisma.token.count({ where }),
    ]);

    return { results: tokens.map((token) => this.toDto(token)), total };
  }

  async create(
    requestor: Requestor,
    personal: boolean,
    data: NewTokenEntity,
  ): Promise<ExposedTokenDto> {
    if (!requestor) {
      throw new ForbiddenException(
        "Requestor must be defined to create a token",
      );
    }
    const hasPermission = await this.checkPermissions.can(
      [Permission.AdminPanelManage],
      requestor,
    );
    if (!personal && !hasPermission) {
      throw new ForbiddenException("Only admins can create service tokens");
    }
    if (!personal) {
      await this.scopedPermissionService.assertCanAssignScopeToNewPrincipal(
        data.scopeOrganizationId,
        requestor,
      );
    }
    const existingTokens = await this.list({ requestor });
    const tokenCount = existingTokens.length;
    if (tokenCount >= ACTIVE_TOKEN_LIMIT) {
      throw new ConflictException(
        `Token limit of ${ACTIVE_TOKEN_LIMIT} reached. You currently have ${tokenCount} active tokens. Please revoke unused tokens before creating a new one.`,
      );
    }

    const invalidReason = isNewTokenInvalid(data);
    if (invalidReason) {
      throw invalidReason;
    }

    const password = generateRandomPassword(48);
    const hash = this.generateHash(password);

    let userIdImpersonate = personal ? requestor.id : undefined;
    if (!userIdImpersonate) {
      const nameSlug = stringToSlug(data.name);
      const user = await this.prisma.user.create({
        data: {
          email: `${nameSlug}-${Date.now()}@bot.internal`,
          role: data.role || Roles.VISITOR,
          type: UserType.bot,
          scopeOrganizationId: data.scopeOrganizationId || null,
        },
      });
      userIdImpersonate = user.id;
    }

    const token = await this.prisma.token.create({
      data: {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: requestor.id,
        name: data.name,
        description: data.description,
        expiresAt: data.expiresAt,
        role: data.role,
        userIdImpersonate,
        status: TokenStatus.active,
        hash,
      },
      include: TOKEN_INCLUDE,
      omit: { hash: true },
    });

    return {
      ...this.toDto(token),
      password,
    };
  }

  delete = async (requestor: Requestor, id: string): Promise<void> => {
    const token = await this.prisma.token.findUnique({
      where: { id },
      include: TOKEN_INCLUDE,
      omit: { hash: true },
    });

    const hasPermission = await this.checkPermissions.can(
      [Permission.AdminPanelManage],
      requestor,
    );
    if (!isRequestorAllowedToUpdateToken(hasPermission, token, requestor)) {
      throw new NotFoundException(
        "Token not found or you don't have permission to delete it",
      );
    }
    await this.prisma.token.update({
      where: { id },
      data: {
        status: TokenStatus.revoked,
        updatedAt: new Date(),
      },
    });
  };

  async findUserByToken(tokenHeader: string): Promise<UserEntity | null> {
    const hash = this.generateHash(tokenHeader);
    const token = await this.prisma.token.findUnique({
      where: { hash },
      include: TOKEN_INCLUDE,
      omit: { hash: true },
    });

    const userImpersonate = token?.userImpersonate ?? null;
    const isInvalid = isTokenInvalid(token);
    if (isInvalid === "undetectedExpired") {
      // Handle undetected expired token case
      await this.prisma.token.update({
        where: { id: token.id },
        data: {
          status: TokenStatus.expired,
          updatedAt: new Date(),
        },
      });
    }
    if (isInvalid) {
      return null;
    }

    const roleOrder: Record<Roles, number> = {
      [Roles.VISITOR]: 0,
      [Roles.READER]: 1,
      [Roles.CONTRIBUTOR]: 2,
      [Roles.ADMIN]: 3,
    };
    const minRole = (a: Roles, b: Roles): Roles =>
      roleOrder[a] <= roleOrder[b] ? a : b;

    const effectiveRole = userImpersonate
      ? minRole(
          token.role ?? Roles.VISITOR,
          userImpersonate.role ?? Roles.VISITOR,
        )
      : (token.role ?? Roles.VISITOR);

    return {
      ...userImpersonate,
      role: effectiveRole,
    };
  }

  async regenerate(
    requestor: Requestor,
    id: string,
    expiresAt: Date,
  ): Promise<ExposedTokenDto> {
    const token = await this.prisma.token.findUnique({
      where: { id },
      include: TOKEN_INCLUDE,
      omit: { hash: true },
    });

    const hasPermission = await this.checkPermissions.can(
      [Permission.AdminPanelManage],
      requestor,
    );
    if (!isRequestorAllowedToUpdateToken(hasPermission, token, requestor)) {
      throw new NotFoundException(
        "Token not found or you don't have permission to regenerate it",
      );
    }
    const password = generateRandomPassword(48);

    const newToken = await this.prisma.token.update({
      where: { id: token.id },
      data: {
        hash: this.generateHash(password),
        expiresAt,
        updatedAt: new Date(),
      },
      include: TOKEN_INCLUDE,
      omit: { hash: true },
    });

    return {
      ...this.toDto(newToken),
      password,
    };
  }

  generateHash(token: string): string {
    return createHash("sha512").update(token).digest("hex");
  }

  private toDto(
    token: Prisma.TokenGetPayload<{
      include: typeof TOKEN_INCLUDE;
      omit: { hash: true };
    }>,
  ): TokenDto {
    const toOwner = (user: { id: string; email: string }): TokenOwnerDto => ({
      id: user.id,
      email: user.email,
    });

    return {
      ...token,
      expiresAt: token.expiresAt.toISOString(),
      kind:
        token.userImpersonate.type === UserType.bot
          ? TokenKind.service
          : TokenKind.personal,
      createdBy: toOwner(token.createdBy),
      userImpersonate: toOwner(token.userImpersonate),
      scopeOrganization: token.userImpersonate.scopeOrganization,
    };
  }
}
