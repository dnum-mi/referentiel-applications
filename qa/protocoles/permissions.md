# Protocole de non-régression — Permissions & rôles (`PRM-`)

> Permissions à 3 couches cumulatives : **rôle global** (Visiteur → Lecteur → Contributeur →
> Administrateur) ∪ **permissions individuelles** ∪ **type d'acteur sur une app**
> (`GET /applications/:id/my-perms`). Page admin : `/administration` (`routeNames.ADMINPAGE`).
> Utilisateurs Keycloak : `admin` (ADMIN) et `user` (READER), mot de passe `pass`.

| Légende           |                                                         |
| :---------------- | :------------------------------------------------------ |
| **Automatisé** ✅ | `e2e/tests/permissions.spec.ts`                         |
| **Statut**        | ✅ 100 % des cas automatisés (POM strict + datafeature) |

---

### PRM-01 — Un non-admin ne peut pas accéder à l'administration ✅

- **Datafeature** : utilisateur `user` (Lecteur).
- **Action** : se connecter en `user`, aller sur `/administration`.
- **Résultat attendu** : redirection hors de la page admin (retour accueil), pas d'accès au panneau.

### PRM-02 — L'admin accède au panneau d'administration ✅

- **Datafeature** : utilisateur `admin`.
- **Action** : aller sur `/administration`.
- **Résultat attendu** : `admin-tabs` visible ; onglets utilisateurs, organisations, tags, sources,
  qualité, matrice de permissions présents.

### PRM-03 — Liste et recherche des utilisateurs ✅

- **Action** : onglet utilisateurs → `admin-users-table` ; rechercher via `admin-user-search`.
- **Résultat attendu** : la liste filtre selon la saisie.

### PRM-04 — Édition du rôle d'un utilisateur ✅

- **Action** : `admin-user-edit-btn` → modifier le rôle → enregistrer.
- **Résultat attendu** : toast de succès ; le rôle affiché est mis à jour.

### PRM-05 — Permissions individuelles additionnelles ✅

- **Action** : `admin-user-permissions-btn` → accorder une permission (ex. `CreateApplication`) à un
  Visiteur → enregistrer.
- **Résultat attendu** : l'utilisateur cible obtient l'action correspondante sans changer de rôle.

### PRM-06 — Matrice de permissions par type d'acteur ✅

- **Datafeature** : utilisateur `admin`.
- **Action** : onglet matrice (`panel-app-perms-matrix`).
- **Résultat attendu** : `app-perms-table` affiche les lignes par type d'acteur et les sélecteurs de
  permissions ; `app-perms-save-btn` présent.

### PRM-07 — Modifier et enregistrer la matrice ✅

- **Action** : modifier un sélecteur `app-perms-select-*` → `app-perms-save-btn`.
- **Résultat attendu** : toast de succès ; la valeur persiste après rechargement.

### PRM-08 — Droits contextuels via type d'acteur (`my-perms`) ✅

- **Datafeature** : une application dont l'utilisateur connecté est acteur (via email ou organisation
  de groupe) — sinon skip.
- **Action** : ouvrir la fiche de cette application ; observer les actions disponibles.
- **Résultat attendu** : `GET /applications/:id/my-perms` renvoie des permissions ; les actions
  contextuelles (édition) sont visibles bien que le rôle global ne les donne pas.

### PRM-09 — Un Lecteur ne voit pas les actions d'écriture ✅

- **Datafeature** : utilisateur `user` (Lecteur), application dont il n'est pas acteur.
- **Action** : ouvrir la fiche, onglet Informations générales.
- **Résultat attendu** : `info-edit-btn` (et autres boutons d'écriture) absents/masqués.

### PRM-10 — Un Contributeur peut éditer une fiche ✅

- **Datafeature** : utilisateur Contributeur.
- **Action** : ouvrir une fiche → `info-edit-btn` → modifier → enregistrer.
- **Résultat attendu** : modification possible ; toast de succès.

### PRM-11 — `AppWritePriority` dissociée de `AppWrite` ✅

- **Action** : accorder `AppWritePriority` sans `AppWrite` à un utilisateur, ouvrir une fiche.
- **Résultat attendu** : il peut modifier la **priorité de redémarrage** (R0–R3) mais pas le reste de
  la fiche.

### PRM-12 — Modifier la matrice des droits génère une entrée dans l'historique ✅

- **Datafeature** : matrice des permissions existante (sinon skip).
- **Action** : modifier un sélecteur `app-perms-select-*` → `app-perms-save-btn` → naviguer vers
  `/historique`.
- **Résultat attendu** : la première entrée de l'historique contient « Modification de la matrice des
  droits » ; le détail mentionne le type d'acteur modifié et les permissions changées. La matrice est
  restaurée via l'API en `finally`.

### PRM-13 — Légende de la matrice des permissions visible ✅

- **Datafeature** : utilisateur `admin` (lecture seule, aucune dépendance de données).
- **Action** : onglet matrice (`panel-app-perms-matrix`) → observer la zone au-dessus du tableau.
- **Résultat attendu** : `app-perms-legend` affiche la légende (`-` aucun droit, `RO` lecture seule,
  `RW` lecture et écriture) et précède `app-perms-table` dans le DOM (affichée juste au-dessus).

### PRM-14 — Un administrateur d'application peut éditer sa fiche mais pas une autre ✅

- **Datafeature** : applications de test jetables (A et B) + un type d'acteur dédié `isAdmin=true`
  **sans matrice** (droits venant du seul `isAdmin`) ; `user@example.com` posé acteur de A avec ce
  type, rôle global Lecteur ; tout nettoyé en fin de test.
- **Action** : connecté en `user`, ouvrir l'onglet Informations de l'application A, puis de B.
- **Résultat attendu** : le bouton d'édition (`info-edit-btn`) est **actif** sur A (droits complets
  forcés par `isAdmin` malgré une matrice vide) et **désactivé** sur B — les droits d'administrateur
  d'application sont bornés à sa seule application (#2028).

### PRM-15 — Un acteur d'un type non administrateur ne dispose que des droits de sa matrice ✅

- **Datafeature** : application de test jetable + type d'acteur dédié `isAdmin=false` **sans matrice** ;
  `user@example.com` posé acteur avec ce type, rôle global Lecteur ; nettoyé en fin de test.
- **Action** : connecté en `user`, ouvrir l'onglet Informations de l'application.
- **Résultat attendu** : le bouton d'édition (`info-edit-btn`) est **désactivé** — un type non-admin
  n'accorde que les droits de sa matrice (ici vide), sans court-circuit `isAdmin`.
