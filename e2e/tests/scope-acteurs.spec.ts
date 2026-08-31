import { test, expect } from "../fixtures/test";
import type { Page } from "@playwright/test";
import { AdminPage, ApplicationPage, loginAs, switchTo } from "../pom";
import { ApiClient } from "../fixtures/api-client";
import { DataFeature } from "../fixtures/datafeature";

// Ids fixes des organisations du seed QA (cf. backend/prisma/seed-qa.ts).
const ORG_TOTO_ID = "a0000000-0000-4000-8000-000000000001";
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

  /**
   * Non-régression #2415 — Le store Pinia des metadatas survit à la navigation. La fiche ne
   * le remplissait que si l'utilisateur a METADATA_READ SUR ELLE, sans jamais le purger
   * sinon : une fiche hors périmètre réaffichait alors les dates et l'auteur de la dernière
   * fiche consultée avec ce droit, faisant passer l'utilisateur pour l'auteur d'une
   * application qui ne le concerne pas.
   *
   * METADATA_READ ne vient QUE de la projection par application (il n'est dans aucun socle
   * global), alors qu'AppRead est global : tout le monde peut ouvrir n'importe quelle fiche,
   * mais seuls les acteurs en voient le bloc de metadatas. D'où ce scénario en deux temps.
   */
  test("SCP-07 - une fiche hors périmètre n'hérite pas des metadatas de la précédente", async ({
    page,
  }) => {
    await loginAs(page, "member-toto");

    const covered = await appByLabel(page, "QA-GROUP-PARENT");
    const foreign = await appByLabel(page, "QA-SCOPE-ABCD");
    test.skip(!covered || !foreign, SEED_HINT);

    const fiche = new ApplicationPage(page);

    // Couverte par le groupe QA_GROUP porté par TOTO : le bloc est là.
    await fiche.open(covered!.id);
    await fiche.expectFicheMetadataVisible();
    const coveredMetadata = await fiche.ficheCreatedAtText();
    expect(coveredMetadata).not.toEqual("");

    // Hors périmètre : aucun droit sur les metadatas, donc AUCUN bloc — et surtout pas
    // celui de la fiche précédente.
    await fiche.open(foreign!.id);
    await fiche.expectFicheMetadataAbsent();
  });

  test("SCP-03 - éditer le rôle d'un utilisateur dans mon périmètre", async ({
    page,
  }) => {
    await loginAs(page, "scope-admin");
    const admin = new AdminPage(page);
    await admin.open();
    await admin.editUserRoleWithinScopeAndSave("qa-target@example.com");
  });

  // Le volet « autorisé » se joue via l'UI réelle (modal d'édition + recherche d'organisation),
  // réactivé après le fix #1830 (le modal ne se ferme plus au rafraîchissement de la liste et le
  // POM absorbe le focus initial différé de DsfrModal). Le volet « refusé » reste au niveau de
  // l'autorisation API : c'est le garde-fou serveur qu'on veut verrouiller. Depuis #2230/#2327 le
  // trajet UI n'existe même plus (la liste est filtrée par périmètre, cf. IMP-08), mais le garde-fou
  // serveur reste la couche à vérifier — c'est lui qui tient si le filtre de liste est contourné.
  // Cible du changement : TOTO (≠ TOTO/TUTU, l'org du seed) — l'option n'est PAS pré-alimentée
  // par `initial-organization`, la sélection prouve donc que la recherche a réellement abouti,
  // et l'assertion finale n'est pas satisfaite d'avance. Restauration en `finally`.
  test("SCP-04 - changer l'organisation dans le périmètre est autorisé, éditer un user hors périmètre est refusé", async ({
    page,
    data,
  }) => {
    // Les deux cibles sont résolues avec le token ADMIN GLOBAL (fixture `data`) AVANT de basculer
    // en `scope-admin` : depuis #2230/#2327 `GET /users?search=` est filtré par le périmètre du
    // requêteur, donc `qa-outside` est introuvable pour un admin scopé. Le résoudre après le
    // `loginAs("scope-admin")` renvoyait `null` et faisait sauter tout le test via `test.skip`,
    // sous un motif trompeur (« fixture absente ») alors que le seed était bien en place.
    const target = await data.getUser("qa-target@example.com");
    const outside = await data.getUser("qa-outside@example.com");
    test.skip(!target || !outside, SEED_HINT);

    // `switchTo` (pas `loginAs`) : la fixture `data` a déjà connecté `page` en `admin`.
    await switchTo(page, "scope-admin");
    const api = await ApiClient.fromPage(page);

    // Affecter une AUTRE organisation du périmètre (TOTO) via le MODAL → autorisé (toast succès).
    const admin = new AdminPage(page);
    await admin.open();
    try {
      await admin.editUserOrganizationAndSave(
        "qa-target@example.com",
        "TOTO",
        "TOTO",
      );
      const updated = await api.userByEmail("qa-target@example.com");
      expect(updated?.organizationId ?? null).toBe(ORG_TOTO_ID);
    } finally {
      // Restaure l'état du seed (TOTO/TUTU) pour les runs suivants et les autres cas SCP.
      await api.setUser(target!.id, {
        role: target!.role,
        additionalPermissions: target!.additionalPermissions,
        scopeOrganizationId: null,
        organizationId: ORG_TOTO_TUTU_ID,
      });
    }

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
