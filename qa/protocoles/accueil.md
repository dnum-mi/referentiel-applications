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

### ACC-09 — Le footer affiche les liens obligatoires ✅

- **Datafeature** : aucune (session vierge).
- **Action** : ouvrir `/` et observer le pied de page.
- **Résultat attendu** : le footer est visible et propose les liens « Accessibilité » et « Plan du
  site ».

### ACC-10 — Un item de navigation principale ouvre sa page ✅

- **Datafeature** : session `admin`.
- **Action** : cliquer l'entrée « Applications » de la navigation principale.
- **Résultat attendu** : navigation vers `/recherche-application`.

### ACC-11 — Recherche rapide : un préfixe court non lemmatisé ramène des suggestions ✅

- **Datafeature** : ≥ 1 application dans le jeu de données.
- **Action** : connecté, saisir dans la recherche rapide du bandeau le préfixe court (4 lettres)
  d'un libellé d'application réel.
- **Résultat attendu** : au moins une suggestion est proposée. Non-régression du bug de recherche
  FTS : le dictionnaire `french` racinisait les libellés (« Application » → « appliqu ») et un
  préfixe court ne matchait plus ; la recherche préfixe repose désormais sur l'index
  `document_simple` (dictionnaire `simple`, non lemmatisé).

### ACC-12 — Recherche rapide indépendante des filtres de la page de recherche ✅

- **Datafeature** : ≥ 1 application dans le jeu de données.
- **Action** : sur `/recherche-application`, filtrer la liste jusqu'à un état vide (0 résultat),
  puis saisir dans la recherche rapide du bandeau le préfixe d'un libellé réel.
- **Résultat attendu** : la recherche rapide propose des suggestions malgré la page filtrée à vide —
  elle interroge l'API indépendamment des filtres de la page et trie par pertinence.

### ACC-13 — Recherche rapide : un terme sans correspondance affiche « Aucun résultat » ✅

- **Datafeature** : aucune (chaîne improbable ne correspondant à aucune application).
- **Action** : connecté, saisir dans la recherche rapide un terme ne correspondant à aucune application.
- **Résultat attendu** : la liste de suggestions affiche l'état « Aucun résultat ».

### ACC-14 — Recherche rapide : navigation clavier dans l'autocomplete (RGAA 4.1.2) ✅

- **Datafeature** : ≥ 1 application dans le jeu de données.
- **Action** : connecté, saisir le préfixe d'un libellé réel, puis utiliser la flèche bas et la
  touche Échap.
- **Résultat attendu** : la liste est déployée (`aria-expanded=true`) ; la flèche bas active la
  première option (`aria-activedescendant` la désigne, `aria-selected="true"`) ; Échap referme la
  liste (`aria-expanded=false`).

### ACC-15 — Recherche rapide : une application au nom ponctué est trouvable par son nom complet ✅

- **Datafeature** : une application dont le libellé contient une ponctuation interne (ex. « O'Kon »,
  « QA-GROUP-CHILD »).
- **Action** : connecté, saisir le **nom complet** de l'application (avec sa ponctuation) dans la
  recherche rapide du bandeau.
- **Résultat attendu** : cette application précise apparaît dans les suggestions. Non-régression du
  bug de tokenisation : la ponctuation interne était supprimée puis collée (« O'Kon » → « OKon »),
  produisant un lexème absent de l'index et rendant l'application introuvable par son nom ; la
  saisie est désormais **découpée** sur la ponctuation (« O'Kon » → `o` + `kon`), comme le parseur
  plein-texte Postgres.
