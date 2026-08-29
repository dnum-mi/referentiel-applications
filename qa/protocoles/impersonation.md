# Protocole de non-régression — Impersonation (`IMP-`)

> Un **administrateur** peut se faire passer pour un autre utilisateur (« se connecter en tant que »).
> L'identité bascule côté serveur (header `x-impersonate-user-id`) : l'admin agit avec les droits de
> la cible et perd ses propres droits admin le temps de la session. Un **bandeau** persistant rappelle
> l'impersonation en cours et permet de l'arrêter. La session survit à un rechargement.
> Page admin : `/administration` (`routeNames.ADMINPAGE`). Utilisateurs Keycloak : `admin` (ADMIN) et
> `user` (READER, `user@example.com`), mot de passe `pass`. Ticket : #1764.

| Légende           |                                                         |
| :---------------- | :------------------------------------------------------ |
| **Automatisé** ✅ | `e2e/tests/impersonation.spec.ts`                       |
| **Statut**        | ✅ 100 % des cas automatisés (POM strict + datafeature) |

---

### IMP-01 — Un admin impersonne un utilisateur puis arrête ✅

- **Datafeature** : utilisateur `admin` (ADMIN) ; cible `user@example.com` (Lecteur).
- **Action** : onglet utilisateurs → ligne de la cible → `admin-user-impersonate-btn` ; observer le
  bandeau ; tenter d'accéder à `/administration` ; cliquer `impersonation-stop-btn`.
- **Résultat attendu** : le bandeau `impersonation-banner` affiche l'email de la cible ; l'accès à
  l'administration est refusé (identité basculée) ; après arrêt, le bandeau disparaît et l'admin
  retrouve l'accès au panneau d'administration.

### IMP-02 — Un admin ne peut pas s'impersonner lui-même ✅

- **Datafeature** : utilisateur `admin` (`admin@example.com`).
- **Action** : onglet utilisateurs → repérer sa propre ligne.
- **Résultat attendu** : aucun bouton `admin-user-impersonate-btn` n'est proposé sur la ligne de
  l'administrateur connecté.

### IMP-03 — L'impersonation survit à un rechargement ✅

- **Datafeature** : utilisateur `admin` ; cible `user@example.com`.
- **Action** : impersonner la cible → recharger la page → arrêter l'impersonation.
- **Résultat attendu** : le bandeau `impersonation-banner` reste affiché après le rechargement (état
  persisté) ; l'arrêt rétablit l'identité administrateur.

### IMP-04 — Un non-admin ne peut pas impersonner ✅

- **Datafeature** : utilisateur `user` (Lecteur) dans un contexte séparé ; cible `user@example.com`.
- **Action** : en `user`, appeler `POST /users/{id}/impersonate`.
- **Résultat attendu** : `403 Forbidden` (l'endpoint exige la permission `AdminPanelManage`).

### IMP-05 — La session d'impersonation est tracée en base (audit) ✅

- **Datafeature** : utilisateur `admin` ; cible `user@example.com`.
- **Action** : impersonner la cible, lire `ImpersonationLog`, puis arrêter et relire.
- **Résultat attendu** : à l'ouverture une entrée existe avec `startedAt` renseigné et `endedAt` nul ;
  après arrêt, la même entrée porte un `endedAt` renseigné.

### IMP-06 — Impossible d'impersonner un compte de service (bot) ✅

- **Datafeature** : un compte `bot` (réutilisé ou créé via l'API token puis révoqué).
- **Action** : en `admin`, appeler `POST /users/{botId}/impersonate`.
- **Résultat attendu** : `400 Bad Request` (impersonation d'un compte de service refusée).

### IMP-07 — Pas d'impersonation en chaîne ✅

- **Datafeature** : utilisateur `admin` ; lecteur `user@example.com`.
- **Action** : en `admin` déjà porteur du header d'impersonation du lecteur, appeler
  `POST /users/{adminId}/impersonate`.
- **Résultat attendu** : `403 Forbidden` — l'identité effective (lecteur) n'a pas le droit
  d'administration, donc aucune impersonation imbriquée n'est possible.

### IMP-09 — Les modifications sous impersonification affichent l'admin réel (#2226) ✅

- **Datafeature** : seed QA (`qa-target@example.com`, promu CONTRIBUTOR le temps du test) ; une
  application de test créée via l'API (supprimée en fin de test).
- **Action** : en `admin`, impersonner `qa-target` → modifier la description de l'application →
  ouvrir l'onglet « Modifications » de la fiche.
- **Résultat attendu** : la ligne d'historique affiche « `qa-target@example.com`
  (via `admin@example.com`) » — l'action est attribuée à l'identité effective ET l'administrateur
  réel est visible. Même affichage sur la page globale Modifications, le détail d'une metadata, ET
  le bandeau « Dernière modification de la fiche » de l'aperçu de l'application (`application-metadata-highlight`,
  #2061 — ce bandeau utilisait un chemin de requête séparé qui n'incluait pas l'impersonator).
  Hors impersonification, aucun « (via …) » n'apparaît.

### IMP-10 — Les signalements créés sous impersonification affichent l'admin réel (#2061) ✅

- **Datafeature** : seed QA (`qa-target@example.com`) ; une application de test créée via l'API
  (supprimée en fin de test).
- **Action** : en `admin`, impersonner `qa-target` → onglet « Signalements » de la fiche → proposer
  un signalement → ouvrir la page globale Signalements (ou l'onglet de la fiche).
- **Résultat attendu** : la ligne du signalement affiche « `qa-target@example.com`
  (via `admin@example.com`) » — l'action est attribuée à l'identité effective ET l'administrateur
  réel est visible. Hors impersonification, aucun « (via …) » n'apparaît.

### IMP-11 — Le journal des actions admin attribue les actions sous impersonification à l'admin réel (#2061) ✅

- **Datafeature** : seed QA (`qa-target@example.com`) ; une application de test créée via l'API
  (supprimée en fin de test).
- **Action** : en `admin`, impersonner `qa-target` → proposer un signalement (n'importe quelle
  action mutante) → arrêter l'impersonation → administration → onglet « Journal des actions »
  (`AdminPanelManage` requis) → rechercher `qa-target@example.com`.
- **Résultat attendu** : la ligne du journal affiche « `qa-target@example.com`
  (via `admin@example.com`) ». Ce journal couvre TOUTES les routes mutantes (y compris acteurs et
  utilisateurs), contrairement à `Metadata`/`Report` limités à leurs propres entités — il reste
  réservé aux administrateurs, plus sensible que les autres historiques ouverts à tous.

### IMP-08 — Un admin scopé ne peut impersonner que dans son périmètre (#2217) ✅

- **Datafeature** : seed QA (`pnpm db:seed:qa`) — `scope-admin` (ADMIN, périmètre TOTO),
  `qa-target@example.com` (org TOTO/TUTU, dans le périmètre), `qa-outside@example.com`
  (org ABCD, hors périmètre).
- **Action** : en `scope-admin`, administration → Gestion des utilisateurs → **rechercher**
  `qa-outside@example.com` ; impersonner `qa-target` puis arrêter. Côté API :
  `POST /users/{id}/impersonate` sur `qa-outside`, et n'importe quelle requête portant le
  header `x-impersonate-user-id` avec son id.
- **Résultat attendu** : `qa-outside` **n'apparaît pas dans la liste** — depuis #2230/#2327 un admin
  scopé ne liste que les utilisateurs de son périmètre (minimisation), la recherche affiche donc
  « Aucune donnée ne correspond à votre recherche » ; le bouton « Se connecter en tant que » est de
  ce fait inatteignable. `403 Forbidden` sur l'endpoint ET sur le header direct (contrôle dans le
  middleware, non contournable) ; impersonation normale dans le périmètre. Un admin sans périmètre
  (global) reste libre d'impersonner tout utilisateur humain — et voit toute la liste.
