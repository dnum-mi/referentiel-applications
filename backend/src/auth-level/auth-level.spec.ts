import { AuthLevel, Permission, Roles } from "@prisma/client";
import type { AuthLevelConfig } from "src/config/configs/auth-level.config";
import type { UserEntity } from "src/user/entities/user.entity";
import {
  evaluateAuthLevel,
  isDowngraded,
  stepDownPrincipal,
} from "./auth-level";

const enforce: AuthLevelConfig = {
  mode: "enforce",
  claim: "auth_mode",
  strongValues: ["card", "otp"],
  idpClaim: "auth_idp",
  trustedIdps: ["partenaire"],
  reauth: { enabled: true, prompt: "login" },
};
const observe: AuthLevelConfig = { ...enforce, mode: "observe" };
const off: AuthLevelConfig = { ...enforce, mode: "off" };

describe("evaluateAuthLevel", () => {
  it("n'évalue rien en mode off", () => {
    expect(evaluateAuthLevel({ auth_mode: "PASSWORD" }, off)).toEqual({
      level: AuthLevel.unknown,
      reason: "disabled",
    });
  });

  it.each([
    ["CARD", "chaîne exacte"],
    ["card", "insensible à la casse"],
    [" Otp ", "espaces retirés"],
  ])("reconnaît une valeur forte (%s : %s)", (value) => {
    expect(evaluateAuthLevel({ auth_mode: value }, enforce)).toMatchObject({
      level: AuthLevel.strong,
      reason: "strong-method",
      claimValue: value.trim(),
    });
  });

  // Compatibilité `amr` : un tableau dont l'un des éléments est fort suffit.
  it("accepte un claim tableau", () => {
    expect(
      evaluateAuthLevel({ auth_mode: ["pwd", "OTP"] }, enforce),
    ).toMatchObject({
      level: AuthLevel.strong,
      reason: "strong-method",
      claimValue: "pwd,OTP",
    });
  });

  it("classe faible une valeur présente mais non listée", () => {
    expect(evaluateAuthLevel({ auth_mode: "PASSWORD" }, enforce)).toEqual({
      level: AuthLevel.weak,
      reason: "weak-method",
      claimValue: "PASSWORD",
      idp: undefined,
    });
  });

  // Un claim qu'on ne sait pas lire ne vaut jamais preuve d'authentification forte.
  it.each([42, true, { mode: "CARD" }, null, ""])(
    "traite un claim non textuel (%p) comme absent",
    (value) => {
      expect(evaluateAuthLevel({ auth_mode: value }, enforce)).toEqual({
        level: AuthLevel.unknown,
        reason: "claim-missing",
      });
    },
  );

  it("signale un claim absent", () => {
    expect(evaluateAuthLevel({ email: "a@b.c" }, enforce)).toEqual({
      level: AuthLevel.unknown,
      reason: "claim-missing",
    });
  });

  it("fait confiance à un fournisseur fédéré listé quand aucun mode n'est transmis", () => {
    expect(evaluateAuthLevel({ auth_idp: "Partenaire" }, enforce)).toEqual({
      level: AuthLevel.strong,
      reason: "trusted-idp",
      idp: "Partenaire",
    });
  });

  // La liste de confiance ne comble que l'absence de mode : elle n'est jamais un fail-open.
  it("fait primer un mode faible explicite sur le fournisseur de confiance", () => {
    expect(
      evaluateAuthLevel(
        { auth_idp: "PARTENAIRE", auth_mode: "PASSWORD" },
        enforce,
      ),
    ).toMatchObject({ level: AuthLevel.weak, reason: "weak-method" });
  });

  it("attribue un mode fort à sa valeur, pas au fournisseur", () => {
    expect(
      evaluateAuthLevel({ auth_idp: "Partenaire", auth_mode: "CARD" }, enforce),
    ).toMatchObject({ level: AuthLevel.strong, reason: "strong-method" });
  });

  it("distingue un fournisseur non listé sans mode", () => {
    expect(evaluateAuthLevel({ auth_idp: "Autre" }, enforce)).toEqual({
      level: AuthLevel.unknown,
      reason: "untrusted-idp",
      idp: "Autre",
    });
  });

  it("ignore le fournisseur quand aucun claim d'IdP n'est configuré", () => {
    const config = { ...enforce, idpClaim: undefined };
    expect(evaluateAuthLevel({ auth_idp: "Partenaire" }, config)).toEqual({
      level: AuthLevel.unknown,
      reason: "claim-missing",
    });
  });

  it("évalue à l'identique en mode observe", () => {
    expect(evaluateAuthLevel({ auth_mode: "PASSWORD" }, observe)).toMatchObject(
      { level: AuthLevel.weak, reason: "weak-method" },
    );
  });
});

describe("isDowngraded", () => {
  it.each([
    [AuthLevel.strong, false],
    [AuthLevel.weak, true],
    [AuthLevel.unknown, true],
  ])("en mode enforce, %s → rétrogradé=%s", (level, expected) => {
    expect(isDowngraded({ level, reason: "claim-missing" }, enforce)).toBe(
      expected,
    );
  });

  it("ne rétrograde jamais en mode observe ni off", () => {
    const weak = { level: AuthLevel.weak, reason: "weak-method" as const };
    expect(isDowngraded(weak, observe)).toBe(false);
    expect(isDowngraded(weak, off)).toBe(false);
  });
});

describe("stepDownPrincipal", () => {
  const admin = {
    id: "admin-id",
    email: "admin@example.test",
    role: Roles.ADMIN,
    type: "human",
    organizationId: "org-1",
    organization: { id: "org-1", path: "MI/DNUM" },
    scopeOrganizationId: "scope-1",
    scopeOrganization: { id: "scope-1", path: "MI" },
    additionalPermissions: [Permission.DataExport],
    isBlocked: false,
    followedApplications: [{ id: "app-1", label: "App" }],
  } as unknown as UserEntity;

  it("réécrit exactement les quatre champs de privilège", () => {
    const standard = stepDownPrincipal(admin);
    expect(standard).toEqual({
      ...admin,
      role: Roles.VISITOR,
      additionalPermissions: [],
      scopeOrganizationId: null,
      scopeOrganization: null,
    });
  });

  // L'organisation et l'e-mail servent à la couche 3 et à la traçabilité : ils restent.
  it("conserve identité, organisation et préférences", () => {
    const standard = stepDownPrincipal(admin);
    expect(standard.id).toBe(admin.id);
    expect(standard.email).toBe(admin.email);
    expect(standard.organizationId).toBe("org-1");
    expect(standard.organization).toEqual(admin.organization);
    expect(standard.followedApplications).toEqual(admin.followedApplications);
  });

  it("ne mute pas l'entrée", () => {
    stepDownPrincipal(admin);
    expect(admin.role).toBe(Roles.ADMIN);
    expect(admin.additionalPermissions).toEqual([Permission.DataExport]);
    expect(admin.scopeOrganizationId).toBe("scope-1");
  });
});
