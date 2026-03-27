import type { UserEntity } from "src/user/entities/user.entity";
import type { TokenStatus } from "./token-status.entity";
import { Roles } from "@prisma/client";

export class TokenEntity {
  id: string;
  role?: Roles;
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
  "name" | "description" | "expiresAt" | "role"
>;
