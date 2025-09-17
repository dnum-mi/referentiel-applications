import type { AdminLevel } from "src/user/entities/user.entity";
import type { TokenEntity } from "../domain/token.entity";
import type { TokenStatus } from "../domain/token-status.entity";

export interface ListTokensParams {
  createdById?: string
}

export interface CreateTokenParams {
  createdById: string
  name: string
  description: string
  expiresAt: Date
  adminLevel?: AdminLevel
  // if not provided, a new user will be created
  userIdImpersonate?: string
  hash: string
}

export interface UpdateTokenParams {
  status?: keyof typeof TokenStatus
  hash?: string
  expiresAt?: Date
  description?: string
  name?: string
  adminLevel?: AdminLevel
}

export interface ITokenRepository {
  list: (args: ListTokensParams) => Promise<TokenEntity[]>
  getById: (id: string) => Promise<TokenEntity | null>
  create: (args: CreateTokenParams) => Promise<TokenEntity>
  delete: (id: string) => Promise<void>
  update: (id: string, data: UpdateTokenParams) => Promise<TokenEntity>
  getByHash: (hash: string) => Promise<TokenEntity | undefined>
}
