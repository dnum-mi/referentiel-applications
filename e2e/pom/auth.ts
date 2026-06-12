import { type Page } from "@playwright/test";
import { login, logout, type Credentials } from "../support/helpers";

/** Rôles e2e disponibles (utilisateurs Keycloak préconfigurés, mot de passe `pass`). */
export type Role = "admin" | "user";

const CREDENTIALS: Record<Role, Credentials> = {
  admin: { user: "admin", pass: "pass" },
  user: { user: "user", pass: "pass" },
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
