# Protocole de non-régression — Qualité générale (`QAL-`)

> Page `/qualite-generale` (`QualityPage`) : statistiques globales et 3 graphiques dataviz
> (« Répartition des applications par IQ », « Applications par mois », « Évolution de l'IQ moyen »).
> Pour la dataviz, on valide via la **bascule graphique ↔ tableau** (canvas et tableau coexistent en
> `v-show`), jamais sur le rendu interne du canvas. Utilisateur par défaut : `admin` / `pass`.

| Légende           |                                                         |
| :---------------- | :------------------------------------------------------ |
| **Automatisé** ✅ | `e2e/tests/qualite-generale.spec.ts`                    |
| **Statut**        | ✅ 100 % des cas automatisés (POM strict + datafeature) |

---

### QAL-01 — La page Qualité générale charge ses widgets ✅

- **Datafeature** : aucune (session `admin`).
- **Action** : ouvrir `/qualite-generale`.
- **Résultat attendu** : le titre « Qualité générale » est visible ; le bloc de statistiques globales
  est chargé et les 3 graphiques exposent leur bouton de bascule.

### QAL-02 — Statistiques globales affichées ✅

- **Datafeature** : aucune (session `admin`).
- **Action** : ouvrir `/qualite-generale` et observer le bloc de statistiques globales.
- **Résultat attendu** : `global-stats-data` est visible et affiche au moins un indicateur.

### QAL-03 — Répartition par IQ : bascule graphique / tableau ✅

- **Datafeature** : ≥ 1 application dans le jeu de données.
- **Action** : sur le widget « Répartition par IQ », cliquer « Voir le tableau » puis « Voir le
  graphique ».
- **Résultat attendu** : le graphique est affiché par défaut ; la bascule montre le tableau puis
  revient au graphique.

### QAL-04 — Applications par mois : bascule graphique / tableau ✅

- **Datafeature** : ≥ 1 application dans le jeu de données.
- **Action** : sur le widget « Applications par mois », basculer graphique → tableau → graphique.
- **Résultat attendu** : la bascule affiche le tableau puis revient au graphique sans erreur.

### QAL-05 — Évolution de l'IQ moyen : bascule graphique / tableau ✅

- **Datafeature** : aucune (session `admin`).
- **Action** : sur la frise « Évolution de l'IQ moyen », basculer vers le tableau puis revenir au
  graphique.
- **Résultat attendu** : le tableau s'affiche après bascule et disparaît au retour au graphique.

### QAL-06 — Évolution de l'IQ moyen : période future affiche l'état vide ✅

- **Datafeature** : aucune (session `admin`).
- **Action** : régler les bornes « Du » / « Au » de la frise sur une période future (2099).
- **Résultat attendu** : le rechargement est déclenché et l'état « Aucune donnée disponible pour la
  période sélectionnée » s'affiche.

### QAL-07 — Évolution de l'IQ moyen : changer le regroupement recharge sans erreur ✅

- **Datafeature** : aucune (session `admin`).
- **Action** : changer le regroupement de la frise (« Semaine » puis « Jour »).
- **Résultat attendu** : la frise se recharge à chaque changement sans message d'erreur ; la bascule
  reste disponible.
