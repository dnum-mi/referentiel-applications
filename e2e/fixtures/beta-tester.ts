import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { AdminPage } from "../pom/admin.page";
import { dbQuery } from "../support/db";
import type { DataFeature } from "./datafeature";

/**
 * Compte applicatif jetable, consulté par une vraie session d'impersonation admin.
 * Aucun endpoint ne crée d'utilisateur : seul cet état initial est provisionné en SQL.
 * Les délégations et leur restauration passent par l'API d'administration existante.
 */
export async function createIsolatedBetaTester(page: Page, data: DataFeature) {
  const id = randomUUID();
  const email = `e2e-beta-${id}@example.test`;
  await dbQuery(
    `INSERT INTO "User" (id, email, role, "additionalPermissions", "emailNotificationsEnabled")
     VALUES ($1, $2, 'READER', '{}'::"Permission"[], false)`,
    [id, email],
  );
  const admin = new AdminPage(page);

  async function setPermissions(permissions: string[]) {
    const result = await data.setUserAdditionalPermissionsVerbose(
      email,
      permissions,
    );
    if (!result.ok)
      throw new Error(
        `Délégation du testeur bêta refusée (${result.status}) : ${result.body}`,
      );
  }

  return {
    email,
    async impersonate() {
      await admin.open();
      await admin.impersonateUser(email);
      await admin.expectImpersonationBanner(email);
    },
    setPermissions,
    async dispose() {
      try {
        await admin.stopImpersonationIfActive();
      } finally {
        try {
          // État d'origine : lecteur sans délégation, même si le scénario a échoué.
          await setPermissions([]);
        } finally {
          for (const table of [
            "ActionLog",
            "UserPermissionLog",
            "UserConnexionLog",
          ]) {
            await dbQuery(`DELETE FROM "${table}" WHERE "userId" = $1`, [id]);
          }
          await dbQuery(
            'DELETE FROM "ImpersonationLog" WHERE "targetId" = $1',
            [id],
          );
          await dbQuery('DELETE FROM "Metadata" WHERE "createdById" = $1', [
            id,
          ]);
          await dbQuery('DELETE FROM "User" WHERE id = $1 AND email = $2', [
            id,
            email,
          ]);
        }
      }
    },
  };
}
