import type { UserEntity } from "src/user/entities/user.entity";
import type { TokenStatus } from "./token-status.entity";
import { Roles, ServiceTokenMode } from "@prisma/client";

/** Mode lu en base : interne à l'authentification, jamais sérialisé dans users/me. */
export const SERVICE_TOKEN_MODE = Symbol("service-token-mode");

export type TokenPrincipal = UserEntity & {
  [SERVICE_TOKEN_MODE]: ServiceTokenMode;
};

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
> & {
  /** Organisation de périmètre pour le compte de service créé (ignorée pour les tokens personnels). */
  scopeOrganizationId?: string | null;
  /** Ignoré pour un token personnel. */
  serviceMode?: ServiceTokenMode;
};
