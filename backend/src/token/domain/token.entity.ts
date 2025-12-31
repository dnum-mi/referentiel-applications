import type { AdminLevel, UserEntity } from "src/user/entities/user.entity";
import type { TokenStatus } from "./token-status.entity";

export class TokenEntity {
  id: string;
  adminLevel?: AdminLevel;
  description: string;
  name: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  status: keyof typeof TokenStatus;
  userImpersonate?: UserEntity | null;
  createdBy: UserEntity;
  hash?: never;
}

export class ExposedTokenEntity extends TokenEntity {
  password: string;
}

export type NewTokenEntity = Pick<
  TokenEntity,
  "name" | "description" | "expiresAt" | "adminLevel"
>;
