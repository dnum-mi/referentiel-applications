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
