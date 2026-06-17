import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { Permission, Prisma, Roles, UserType } from "@prisma/client";
import { createHash, createHmac } from "node:crypto";
import { CheckPermissions } from "src/common/service/check-permissions.service";
import { appConfig } from "src/config/configs";
import { PrismaService } from "src/prisma/prisma.service";
import { Requestor, UserEntity } from "src/user/entities/user.entity";
import { generateRandomPassword, stringToSlug } from "src/utils/functions";
import { TokenStatus } from "./domain/token-status.entity";
import { NewTokenEntity } from "./domain/token.entity";
import { ExposedTokenDto, TokenDto } from "./dto/token.dto";
import {
  isNewTokenInvalid,
  isRequestorAllowedToUpdateToken,
  isTokenInvalid,
} from "./use-cases.ts/token-control.use-case";

const ACTIVE_TOKEN_LIMIT = 5;

@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly checkPermissions: CheckPermissions,
    @Inject(appConfig.KEY)
    private readonly app: ConfigType<typeof appConfig>,
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
      include: {
        createdBy: true,
        userImpersonate: true,
      },
      omit: { hash: true },
    });

    return tokens.map((token) => ({
      ...token,
      expiresAt: token.expiresAt.toISOString(),
    }));
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
      include: {
        createdBy: true,
        userImpersonate: true,
      },
      omit: { hash: true },
    });

    return {
      ...token,
      password,
      expiresAt: token.expiresAt.toISOString(),
    };
  }

  delete = async (requestor: Requestor, id: string): Promise<void> => {
    const token = await this.prisma.token.findUnique({
      where: { id },
      include: {
        createdBy: true,
        userImpersonate: true,
      },
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
    const findByHash = (hash: string) =>
      this.prisma.token.findUnique({
        where: { hash },
        include: {
          createdBy: true,
          userImpersonate: true,
        },
        omit: { hash: true },
      });

    let token = await findByHash(this.generateHash(tokenHeader));
    // Backward compatibility: tokens issued before TOKEN_PEPPER was enabled were
    // stored with the legacy plain SHA-512 hash. Fall back to it on a miss.
    if (!token && this.app.tokenPepper) {
      token = await findByHash(this.legacyHash(tokenHeader));
    }

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
      include: {
        createdBy: true,
        userImpersonate: true,
      },
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
      include: {
        createdBy: true,
        userImpersonate: true,
      },
      omit: { hash: true },
    });

    return {
      ...newToken,
      password,
      expiresAt: newToken.expiresAt.toISOString(),
    };
  }

  generateHash(token: string): string {
    const pepper = this.app.tokenPepper;
    // Defense in depth: when a server-side pepper is configured, derive the
    // stored hash with HMAC-SHA512 so a read-only DB leak does not expose
    // reversible token hashes. The hash stays deterministic, preserving the
    // O(1) `where: { hash }` lookup. Without a pepper, keep the legacy hash so
    // tokens issued previously remain valid.
    if (pepper) {
      return createHmac("sha512", pepper).update(token).digest("hex");
    }
    return this.legacyHash(token);
  }

  private legacyHash(token: string): string {
    return createHash("sha512").update(token).digest("hex");
  }
}
