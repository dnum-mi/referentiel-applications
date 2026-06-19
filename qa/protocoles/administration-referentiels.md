# Protocole de non-régression — Administration des référentiels (`ADM-`)

> Complète `permissions.md`, qui couvre l'accès au panneau admin, les utilisateurs et la matrice de
> permissions, mais pas la gestion des référentiels (organisations, tags, sources de noms
> alternatifs) ni les traitements de batch. Page admin : `/administration`. Utilisateur par défaut :
> `admin` / `pass`.

| Légende           |                                                                              |
| :---------------- | :--------------------------------------------------------------------------- |
| **Automatisé** ✅ | tests Playwright dédiés dans `e2e/tests/administration-referentiels.spec.ts` |
| **Statut**        | 🟢 automatisé — 9 cas couverts par la CI                                     |

---

### ADM-01 — Créer une organisation et la retrouver dans le catalogue ✅

- **Action** : administration → onglet Organisations → créer une organisation (chemin, sigle, URL).
- **Résultat attendu** : elle apparaît dans `admin-organizations-table` ; elle est sélectionnable dans
  le filtre Organisation du catalogue (`organization-filter-input`, voir CAT-05).

### ADM-02 — Modifier une organisation ✅

- **Datafeature** : organisation de test créée via l'API (nettoyée en fin de test).
- **Action** : `admin-organization-edit-btn` → changer le sigle ou l'URL → enregistrer.
- **Résultat attendu** : toast de succès ; la ligne dans `admin-organizations-table` reflète les
  nouvelles valeurs sans recharger la page.

### ADM-03 — Gérer les références MAIA d'une organisation ✅

- **Datafeature** : organisation de test créée via l'API (nettoyée en fin de test).
- **Action** : sur une organisation, `organization-maia-reference-add-btn` pour ajouter une référence,
  `organization-maia-reference-delete-btn` pour la retirer.
- **Résultat attendu** : la colonne « Refs MAIA » de `admin-organizations-table` reflète l'ajout et le
  retrait.

### ADM-04 — Supprimer une organisation ✅

- **Datafeature** : une organisation de test sans application ni acteur rattaché.
- **Action** : `admin-organization-delete-btn` → confirmer.
- **Résultat attendu** : l'organisation disparaît de `admin-organizations-table` et du filtre
  Organisation du catalogue.

### ADM-05 — Cycle de vie d'un tag ✅

- **Action** : administration → onglet Tags → créer un tag → `admin-tag-edit-btn` pour le renommer →
  `admin-tag-delete-btn` pour le supprimer.
- **Résultat attendu** : le tag créé est disponible dans le sélecteur de tags d'une fiche application
  pendant son existence ; `admin-tags-table` reflète chaque étape ; le compteur d'applications liées
  est cohérent.

### ADM-06 — Cycle de vie d'une source de noms alternatifs ✅

- **Action** : administration → onglet Sources de noms alternatifs → créer une source →
  `admin-label-source-edit-btn` pour la modifier → `admin-label-source-delete-btn` pour la supprimer.
- **Résultat attendu** : `admin-label-sources-table` reflète chaque étape ; le compteur de noms
  alternatifs liés est cohérent.

### ADM-07 — Créer une campagne dette IT et la retrouver ✅

- **Datafeature** : nettoyage idempotent du millésime de test via l'API admin (suppression si présent).
- **Action** : administration → onglet Campagnes dette IT → `admin-create-campaign-btn` pour créer une
  campagne (millésime + libellé) → vérifier sa présence dans `admin-campaigns-table` →
  `admin-campaign-delete-btn` pour la supprimer.
- **Résultat attendu** : la campagne créée apparaît dans le tableau ; sa suppression la retire ; les
  actions admin sont réservées au privilège `AdminPanelManage`.

### ADM-08 — Importer un acteur via un fichier Excel (création) ✅

- **Datafeature** : une application existante (lecture API) et un type d'acteur (résolu en base) ;
  le classeur Excel est généré à la volée au format de l'export (onglet « Acteurs »).
- **Action** : administration → onglet Batch de données → section « Import Excel des acteurs » →
  sélectionner le fichier (`admin-import-actors-file`) → `admin-import-actors-submit`.
- **Résultat attendu** : le rapport d'exécution (`admin-import-report`) indique « 1 créé(s) » et
  « 0 en erreur », est téléchargeable (`admin-import-report-download`), et l'acteur est bien créé.

### ADM-09 — Importer un acteur via un fichier Excel (mise à jour) ✅

- **Datafeature** : un acteur de test créé via l'API (nettoyé en fin de test) ; le classeur Excel
  reprend son « ID Acteur » avec un nom modifié.
- **Action** : administration → onglet Batch de données → section « Import Excel des acteurs » →
  importer le fichier contenant l'identifiant de l'acteur.
- **Résultat attendu** : le rapport indique « 1 mis à jour » et « 0 en erreur » ; la modification du
  nom est appliquée à l'acteur existant (même identifiant).
