import { BadRequestException } from "@nestjs/common";
import { TokenStatus } from "../domain/token-status.entity";
import type { TokenEntity } from "../domain/token.entity";
import type { Requestor } from "src/user/entities/user.entity";
import { AdminLevel, UserType } from "src/user/entities/user.entity";

export const tokenInvalidReason = {
  notFound: "notFound",
  expired: "expired",
  undetectedExpired: "undetectedExpired",
  revoked: "revoked",
  notActive: "notActive",
} as const;

export function isTokenInvalid(token?: TokenEntity): keyof typeof tokenInvalidReason | false {
  if (!token) {
    return "notFound";
  }
  if (token.expiresAt < new Date()) {
    if (token.status === TokenStatus.active) {
      return "undetectedExpired";
    }
    return "expired";
  }
  if (token.status !== TokenStatus.active) {
    return "notActive";
  }
  return false;
}

export type newTokenInvalidReason = BadRequestException;

export function isNewTokenInvalid(token: Pick<TokenEntity, "expiresAt">): newTokenInvalidReason | false {
  if (token.expiresAt < new Date()) {
    return new BadRequestException("The expiration date must be in the future");
  }
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  if (token.expiresAt > maxDate) {
    return new BadRequestException("The expiration date must be less than 1 year");
  }
  return false;
}

export function isRequestorAllowedToUpdateToken(token?: TokenEntity, requestor?: Requestor): boolean {
  // first check if the token exists and if the requestor is defined
  if (!token || !requestor?.id) {
    return false;
  }
  // then check token status
  if (token.status === TokenStatus.revoked) {
    return false;
  }
  // so token is active or expired

  // bot tokens
  if (token.userImpersonate.type === UserType.bot) {
    // only admins can update bot tokens
    if (requestor.adminLevel !== AdminLevel.ADMIN) {
      return false;
    }
    return true;
  }

  // personal tokens
  // only the creator of the token can update it
  if (token.createdBy.id !== requestor.id) {
    return false;
  }
  return true;
}
