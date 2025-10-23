import { createHash } from "node:crypto";
import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AdminLevel, Requestor, UserEntity } from "src/user/entities/user.entity";
import { generateRandomPassword } from "src/utils/functions";
import { TokenStatus } from "./domain/token-status.entity";
import { NewTokenEntity } from "./domain/token.entity";
import { ExposedTokenDto, TokenDto } from "./dto/token.dto";
import { ITokenRepository } from "./repository/token.repository.interface";
import { isNewTokenInvalid, isRequestorAllowedToUpdateToken, isTokenInvalid } from "./use-cases.ts/token-control.use-case";

@Injectable()
export class TokenService {
  constructor(
    @Inject("ITokenRepository")
    private readonly repository: ITokenRepository,
  ) {}

  async list({
    requestor,
  }: {
    requestor?: Requestor
  }): Promise<TokenDto[]> {
    const tokens = await this.repository.list({
      createdById: requestor?.id,
    });
    return tokens.map(({ hash: _h, ...token }) => ({
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
      throw new ForbiddenException("Requestor must be defined to create a token");
    }
    if (!personal && requestor.adminLevel !== AdminLevel.ADMIN) {
      throw new ForbiddenException("Only admins can create service tokens");
    }
    const invalidReason = isNewTokenInvalid(data);
    if (invalidReason) {
      throw invalidReason;
    }

    const password = generateRandomPassword(48);
    const hash = this.generateHash(password);
    const { hash: _h, ...token } = await this.repository.create({
      createdById: requestor.id,
      hash,
      name: data.name,
      description: data.description,
      expiresAt: data.expiresAt,
      adminLevel: data.adminLevel,
      userIdImpersonate: personal ? requestor.id : undefined,
    });
    return {
      ...token,
      password,
      expiresAt: token.expiresAt.toISOString(),
    };
  }

  delete = async (requestor: Requestor, id: string): Promise<void> => {
    const token = await this.repository.getById(id);
    if (!isRequestorAllowedToUpdateToken(token, requestor)) {
      throw new NotFoundException("Token not found or you don't have permission to delete it");
    }
    await this.repository.update(id, { status: TokenStatus.revoked });
  };

  async findUserByToken(tokenHeader: string): Promise<UserEntity | null> {
    const hash = this.generateHash(tokenHeader);
    const token = await this.repository.getByHash(hash);
    const userImpersonate = token?.userImpersonate ?? null;
    const isInvalid = isTokenInvalid(token);
    if (isInvalid === "undetectedExpired") {
      // Handle undetected expired token case
      await this.repository.update(token.id, { status: TokenStatus.expired });
    }
    if (isInvalid) {
      return null;
    }

    let adminLevel: number;
    if (userImpersonate) {
      adminLevel = Math.min(token.adminLevel ?? 0, userImpersonate?.adminLevel ?? 0);
    } else {
      adminLevel = token.adminLevel ?? 0;
    }
    return {
      ...userImpersonate,
      adminLevel,
    };
  }

  async regenerate(requestor: Requestor, id: string, expiresAt: Date): Promise<ExposedTokenDto> {
    const token = await this.repository.getById(id);
    if (!isRequestorAllowedToUpdateToken(token, requestor)) {
      throw new NotFoundException("Token not found or you don't have permission to regenerate it");
    }
    const password = generateRandomPassword(48);
    const newToken = await this.repository.update(token.id, {
      hash: this.generateHash(password),
      expiresAt,
    });
    return { ...newToken, password, expiresAt: newToken.expiresAt.toISOString() };
  }

  generateHash(token: string): string {
    return createHash("sha512").update(token).digest("hex");
  }
}
