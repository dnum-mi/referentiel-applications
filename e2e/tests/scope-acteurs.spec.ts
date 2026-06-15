import { test, expect } from "../fixtures/test";
import type { Page } from "@playwright/test";
import { AdminPage, ApplicationPage, loginAs } from "../pom";
import { ApiClient } from "../fixtures/api-client";
import { DataFeature } from "../fixtures/datafeature";

// Ids fixes des organisations du seed QA (cf. backend/prisma/seed-qa.ts).
const ORG_TOTO_TUTU_ID = "a0000000-0000-4000-8000-000000000002";
const ORG_ABCD_ID = "a0000000-0000-4000-8000-000000000003";

/**
 * Non-régression — Périmètres admin & groupes d'acteurs (protocole `qa/protocoles/scope-acteurs.md`).
 * Couvre les cas #12-17 de l'issue #1825. Fixtures déterministes du seed QA (`pnpm db:seed:qa`) :
 * organisations TOTO / TOTO/TUTU / ABCD, comptes Keycloak scopés, applications QA-SCOPE-* / QA-GROUP-*.
 * POM strict. Le signal « est admin / est acteur » sur une application = bouton d'édition actif.
 */
const SEED_HINT = "Fixture QA absente — `pnpm db:seed:qa` a-t-il été lancé ?";

/** Résout l'id d'une application fixture par son libellé, avec le token de l'utilisateur courant. */
async function appByLabel(page: Page, label: string) {
  const data = new DataFeature(await ApiClient.fromPage(page));
  return data.applicationByLabel(label);
}

test.describe("Périmètres admin & groupes d'acteurs", () => {
  test("SCP-01 - admin scopé TOTO/ est admin sur une app à acteur TOTO/*", async ({
    page,
  }) => {
    await loginAs(page, "scope-admin");
    const app = await appByLabel(page, "QA-SCOPE-TOTO");
    test.skip(!app, SEED_HINT);

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-infos");
    await fiche.expectInfoEditAvailable();
  });

  test("SCP-02 - admin scopé TOTO/ n'est PAS admin sur une app à acteur ABCD/*", async ({
    page,
  }) => {
    await loginAs(page, "scope-admin");
    const app = await appByLabel(page, "QA-SCOPE-ABCD");
    test.skip(!app, SEED_HINT);

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-infos");
    await fiche.expectInfoEditDisabled();
  });

  test("SCP-05 - un membre de TOTO/TUTU est acteur via un groupe TOTO/", async ({
    page,
  }) => {
    await loginAs(page, "member-toto-tutu");
    const app = await appByLabel(page, "QA-GROUP-PARENT");
    test.skip(!app, SEED_HINT);

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-infos");
    await fiche.expectInfoEditAvailable();
  });

  test("SCP-06 - un membre de TOTO n'est PAS acteur via un groupe TOTO/TUTU", async ({
    page,
  }) => {
    await loginAs(page, "member-toto");
    const app = await appByLabel(page, "QA-GROUP-CHILD");
    test.skip(!app, SEED_HINT);

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-infos");
    await fiche.expectInfoEditDisabled();
  });

  test("SCP-03 - éditer le rôle d'un utilisateur dans mon périmètre", async ({
    page,
  }) => {
    await loginAs(page, "scope-admin");
    const admin = new AdminPage(page);
    await admin.open();
    await admin.editUserRoleWithinScopeAndSave("qa-target@example.com");
  });

  // Note : la frontière de périmètre se vérifie au niveau de l'autorisation (cœur de #14/#15). L'édition
  // via l'UI est instable (le modal d'édition se ferme au rafraîchissement de la liste, #1830) et un
  // payload partiel déclenche une 500 (#1831) → on valide la règle via l'endpoint, token du requérant scopé.
  test("SCP-04 - changer l'organisation dans le périmètre est autorisé, éditer un user hors périmètre est refusé", async ({
    page,
  }) => {
    await loginAs(page, "scope-admin");
    const api = await ApiClient.fromPage(page);
    const target = await api.userByEmail("qa-target@example.com");
    const outside = await api.userByEmail("qa-outside@example.com");
    test.skip(!target || !outside, SEED_HINT);

    // Payload complet (rôle + permissions + périmètre), comme l'UI, sur un user DANS le périmètre TOTO/.
    const base = {
      role: target!.role,
      additionalPermissions: target!.additionalPermissions,
      scopeOrganizationId: null,
    };

    // Affecter une organisation du périmètre (TOTO/TUTU) → autorisé.
    const within = await api.setUser(target!.id, {
      ...base,
      organizationId: ORG_TOTO_TUTU_ID,
    });
    expect(within).not.toBeNull();

    // Éditer un utilisateur HORS du périmètre (organisation ABCD/) → refusé par le contrôle de périmètre.
    const denied = await api.setUser(outside!.id, {
      role: outside!.role,
      additionalPermissions: outside!.additionalPermissions,
      scopeOrganizationId: null,
      organizationId: ORG_ABCD_ID,
    });
    expect(denied).toBeNull();
  });
});
