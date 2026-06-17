# Protocole de non-régression — Qualité générale & tableaux de bord (`QUA-`)

> Couvre la page `/qualite-generale` (statistiques globales, répartition IQ, courbes de tendance) et
> le diagramme TIME (`/time`). Pages en lecture seule : on vérifie le chargement, l'affichage des
> données et les interactions (filtres, bascule graphique/tableau). Utilisateur par défaut :
> `admin` / `pass`.

| Légende           |                                                                   |
| :---------------- | :---------------------------------------------------------------- |
| **Automatisé** ✅ | tests Playwright dédiés dans `e2e/tests/qualite-generale.spec.ts` |
| **Statut**        | 🟢 automatisé — 7 cas couverts par la CI                          |

---

### QUA-01 — Charger la page qualité générale ✅

- **Action** : naviguer vers `/qualite-generale`.
- **Résultat attendu** : `quality-page` visible ; `quality-page-title` affiche « Qualité générale » ;
  `global-stats-data` contient au moins un indicateur (`global-stats-item-*`).

### QUA-02 — Graphique de répartition IQ par tranche ✅

- **Action** : observer la section `quality-iq-chart`.
- **Résultat attendu** : `applications-iq-chart-canvas` (graphique) ou `applications-iq-chart-table`
  (tableau) est visible ; le toggle `applications-iq-chart-toggle-view` permet de basculer entre les
  deux vues.

### QUA-03 — Courbe de tendance IQ avec filtres ✅

- **Action** : section `quality-iq-trend-chart` → vérifier le chargement.
- **Résultat attendu** : le graphique, tableau ou message « pas de données » est visible ; pas de
  `iq-chart-error`.

### QUA-04 — Bascule graphique / tableau sur la répartition IQ ✅

- **Action** : cliquer `applications-iq-chart-toggle-view`.
- **Résultat attendu** : si le canvas était visible, `applications-iq-chart-table` s'affiche à la
  place (et inversement) ; les données sont cohérentes entre les deux vues.

### QUA-05 — Charger le diagramme TIME ✅

- **Action** : naviguer vers `/time`.
- **Résultat attendu** : `time-view` visible ; `time-title` affiche « Diagramme Time » ;
  `technical-debt-chart-section` est présente ; `time-filters` (sidebar) est accessible.

### QUA-06 — Charger l'historique des modifications ✅

- **Action** : naviguer vers `/historique`.
- **Résultat attendu** : la table de l'historique est visible (ou `history-empty` si aucune donnée) ;
  les filtres `history-filter-date-from` / `history-filter-date-to` sont accessibles.

### QUA-07 — Filtrer l'historique par plage de dates ✅

- **Action** : cliquer `history-apply-filters` → vérifier la table ; cliquer `history-clear-filters`.
- **Résultat attendu** : la liste est filtrée puis réinitialisée ; pas d'erreur.
