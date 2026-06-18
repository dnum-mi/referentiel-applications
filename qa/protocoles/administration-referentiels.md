# Protocole de non-régression — Administration des référentiels (`ADM-`)

> Complète `permissions.md`, qui couvre l'accès au panneau admin, les utilisateurs et la matrice de
> permissions, mais pas la gestion des référentiels (organisations, tags, sources de noms
> alternatifs) ni les traitements de batch. Page admin : `/administration`. Utilisateur par défaut :
> `admin` / `pass`.

| Légende           |                                                                              |
| :---------------- | :--------------------------------------------------------------------------- |
| **Automatisé** ✅ | tests Playwright dédiés dans `e2e/tests/administration-referentiels.spec.ts` |
| **Statut**        | 🟢 automatisé — 6 cas couverts par la CI                                     |

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
