# Protocole de non-régression — Accueil & chrome global (`ACC-`)

> Page d'accueil publique (`/`, `HomePage`) et **chrome global** défini dans `App.vue` (header,
> navigation principale, recherche rapide du bandeau). Couvre le comportement **public vs connecté**.
> Utilisateur par défaut connecté : `admin` / `pass`.

| Légende           |                                           |
| :---------------- | :---------------------------------------- |
| **Automatisé** ✅ | `e2e/tests/accueil.spec.ts`               |
| **Statut**        | ✅ 100 % des cas automatisés (POM strict) |

---

### ACC-01 — La page d'accueil publique s'affiche sans authentification ✅

- **Datafeature** : aucune (session vierge, page `requiresAuth: false`).
- **Action** : ouvrir `/` sans être authentifié.
- **Résultat attendu** : le titre « Le référentiel des applications » est visible ; pas de
  redirection vers Keycloak.

### ACC-02 — La section Objectifs affiche ses 5 tuiles ✅

- **Datafeature** : aucune (page statique).
- **Action** : ouvrir `/`.
- **Résultat attendu** : la section « Objectifs » et ses 5 tuiles (centralisation, accès,
  dépendances, maintenance, exploitabilité) sont visibles.

### ACC-03 — Le lien de contact pointe vers Tchap ✅

- **Datafeature** : aucune (page statique).
- **Action** : ouvrir `/` et inspecter le lien de contact de la section beta.
- **Résultat attendu** : la section beta est visible ; le lien de contact pointe vers `tchap.gouv.fr`.

### ACC-04 — Header public : seul « Se connecter » est proposé ✅

- **Datafeature** : aucune (session vierge).
- **Action** : ouvrir `/` sans être authentifié et observer le bandeau.
- **Résultat attendu** : le raccourci « Se connecter » est présent ; « Mon profil » et
  « Déconnexion » sont absents ; la navigation principale n'est pas rendue.

### ACC-05 — Header connecté : navigation principale et profil/déconnexion ✅

- **Datafeature** : session `admin`.
- **Action** : ouvrir `/` connecté et observer le bandeau.
- **Résultat attendu** : la navigation principale est visible (Applications, Qualité Générale…) ;
  « Mon profil » et « Déconnexion » sont présents ; « Se connecter » est absent.

### ACC-06 — Le raccourci « Admin » n'apparaît que pour un administrateur ✅

- **Datafeature** : un compte `admin` et un compte `user` (contexte navigateur séparé).
- **Action** : observer le bandeau connecté en `admin` puis en `user`.
- **Résultat attendu** : le raccourci « Admin » est présent pour l'administrateur, absent pour un
  utilisateur sans droit d'administration.

### ACC-07 — Recherche rapide : suggestion puis navigation vers la fiche ✅

- **Datafeature** : ≥ 1 application dans le jeu de données.
- **Action** : connecté, saisir un terme dans la recherche rapide du bandeau et sélectionner une
  suggestion.
- **Résultat attendu** : une suggestion est proposée ; sa sélection ouvre la fiche application
  correspondante (`/applications/:id`).

### ACC-08 — La recherche rapide est absente en public ✅

- **Datafeature** : aucune (session vierge).
- **Action** : ouvrir `/` sans être authentifié.
- **Résultat attendu** : la recherche rapide du bandeau n'est pas rendue (réservée aux utilisateurs
  connectés).
