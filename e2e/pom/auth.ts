import { type Page } from "@playwright/test";
import { login, logout, type Credentials } from "../support/helpers";

/** Rôles e2e disponibles (utilisateurs Keycloak préconfigurés, mot de passe `pass`). */
export type Role =
  | "admin"
  | "user"
  | "scope-admin"
  | "member-toto-tutu"
  | "member-toto"
  | "support"
  | "admin-weak"
  | "user-federated";

const CREDENTIALS: Record<Role, Credentials> = {
  admin: { user: "admin", pass: "pass" },
  user: { user: "user", pass: "pass" },
  // Comptes scopés pour la non-régression « périmètres & groupes d'acteurs » (seed QA).
  "scope-admin": { user: "scope-admin", pass: "pass" },
  "member-toto-tutu": { user: "member-toto-tutu", pass: "pass" },
  "member-toto": { user: "member-toto", pass: "pass" },
  // Compte utilisé pour la première connexion (assignation d'organisation depuis MAIA).
  support: { user: "support", pass: "pass" },
  // #1985 : niveau d'authentification simulé par le realm — `admin-weak` porte un mode faible
  // (PASSWORD, ADMIN en base via le seed), `user-federated` un fournisseur non listé sans mode.
  "admin-weak": { user: "admin-weak", pass: "pass" },
  "user-federated": { user: "user-federated", pass: "pass" },
};

/** Connexion par rôle (`admin` par défaut — acteur par défaut de la datafeature). */
export async function loginAs(page: Page, role: Role = "admin"): Promise<void> {
  await login(page, CREDENTIALS[role]);
}

/** Déconnecte la session courante puis se reconnecte sous un autre rôle. */
export async function switchTo(page: Page, role: Role): Promise<void> {
  await logout(page);
  await loginAs(page, role);
}
