import type { Requestor } from "src/user/entities/user.entity";
import { UserType } from "src/user/entities/user.entity";
import { TokenStatus } from "../domain/token-status.entity";
import type { TokenEntity } from "../domain/token.entity";
import { isRequestorAllowedToUpdateToken } from "./token-control.use-case";

function buildRequestor(id: string): Requestor {
  return { id } as Requestor;
}

function buildToken(overrides: Partial<TokenEntity> = {}): TokenEntity {
  return {
    id: "token-1",
    description: "desc",
    name: "name",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    createdAt: new Date(),
    updatedAt: new Date(),
    status: TokenStatus.active,
    createdBy: {
      id: "user-1",
      type: UserType.human,
    } as TokenEntity["createdBy"],
    userImpersonate: {
      id: "user-1",
      type: UserType.human,
    } as TokenEntity["userImpersonate"],
    ...overrides,
  } as TokenEntity;
}

describe("isRequestorAllowedToUpdateToken", () => {
  it("denies when token is missing", () => {
    expect(
      isRequestorAllowedToUpdateToken(
        true,
        undefined,
        buildRequestor("user-1"),
      ),
    ).toBe(false);
  });

  it("denies when requestor is missing", () => {
    expect(isRequestorAllowedToUpdateToken(true, buildToken(), undefined)).toBe(
      false,
    );
  });

  it("denies when the token is revoked, even for admins", () => {
    const token = buildToken({ status: TokenStatus.revoked });
    expect(
      isRequestorAllowedToUpdateToken(true, token, buildRequestor("user-1")),
    ).toBe(false);
  });

  it("lets an admin manage another user's personal token", () => {
    const token = buildToken({
      createdBy: {
        id: "owner",
        type: UserType.human,
      } as TokenEntity["createdBy"],
      userImpersonate: {
        id: "owner",
        type: UserType.human,
      } as TokenEntity["userImpersonate"],
    });
    expect(
      isRequestorAllowedToUpdateToken(true, token, buildRequestor("admin")),
    ).toBe(true);
  });

  it("lets an admin manage a service (bot) token", () => {
    const token = buildToken({
      userImpersonate: {
        id: "bot",
        type: UserType.bot,
      } as TokenEntity["userImpersonate"],
    });
    expect(
      isRequestorAllowedToUpdateToken(true, token, buildRequestor("admin")),
    ).toBe(true);
  });

  it("denies a non-admin trying to manage a service (bot) token", () => {
    const token = buildToken({
      userImpersonate: {
        id: "bot",
        type: UserType.bot,
      } as TokenEntity["userImpersonate"],
    });
    expect(
      isRequestorAllowedToUpdateToken(false, token, buildRequestor("user-1")),
    ).toBe(false);
  });

  it("lets the owner manage their own personal token", () => {
    const token = buildToken({
      createdBy: {
        id: "owner",
        type: UserType.human,
      } as TokenEntity["createdBy"],
    });
    expect(
      isRequestorAllowedToUpdateToken(false, token, buildRequestor("owner")),
    ).toBe(true);
  });

  it("denies a non-admin trying to manage another user's personal token", () => {
    const token = buildToken({
      createdBy: {
        id: "owner",
        type: UserType.human,
      } as TokenEntity["createdBy"],
    });
    expect(
      isRequestorAllowedToUpdateToken(
        false,
        token,
        buildRequestor("other-user"),
      ),
    ).toBe(false);
  });
});
