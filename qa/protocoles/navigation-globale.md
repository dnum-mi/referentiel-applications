# Protocole de non-régression — Navigation globale & pages statiques (`NAV-`)

> Couvre les parcours de navigation transversaux (accueil, plan du site, accessibilité, erreur 404),
> le bandeau applicatif (connexion, déconnexion, liens de navigation) et les gardes de route. Ces
> tests vérifient que l'ossature de l'application ne régresse pas. Utilisateur par défaut :
> `admin` / `pass`.

| Légende           |                                                                              |
| :---------------- | :--------------------------------------------------------------------------- |
| **Automatisé** ❌ | aucun test Playwright dédié pour l'instant                                   |
| **Statut**        | 🆕 protocole à dérouler manuellement, candidat à l'automatisation ultérieure |

---

### NAV-01 — Charger la page d'accueil

- **Action** : naviguer vers `/`.
- **Résultat attendu** : `home-title` affiche « Le référentiel des applications » ; les tuiles
  objectifs sont visibles (`home-tile-centralisation`, `home-tile-access`, etc.) ; le lien de contact
  (`home-contact-link`) est présent.

### NAV-02 — Lien « Se connecter » → Keycloak → retour authentifié

- **Datafeature** : session non authentifiée.
- **Action** : page d'accueil → lien « Se connecter » → saisir identifiants sur Keycloak → valider.
- **Résultat attendu** : redirection vers l'application ; le bandeau affiche « Mon profil » ou
  « Déconnexion » à la place de « Se connecter ».

### NAV-03 — Déconnexion

- **Action** : cliquer « Déconnexion » dans le bandeau.
- **Résultat attendu** : retour sur la page d'accueil ou la page de connexion ; le bandeau affiche de
  nouveau « Se connecter ».

### NAV-04 — Page plan du site

- **Action** : naviguer vers `/plan-du-site`.
- **Résultat attendu** : la page charge sans erreur ; les liens vers les principales sections
  (catalogue, administration, profil, signalements, qualité, time) sont présents.

### NAV-05 — Page accessibilité

- **Action** : naviguer vers `/accessibilite`.
- **Résultat attendu** : la page charge sans erreur ; la déclaration d'accessibilité est affichée.

### NAV-06 — Page 404 (route inconnue)

- **Action** : naviguer vers `/route-qui-nexiste-pas-e2e`.
- **Résultat attendu** : la page 404 s'affiche avec un message d'erreur explicite et un lien de
  retour vers l'accueil ou le catalogue.

### NAV-07 — Accès non authentifié au catalogue → redirection login

- **Datafeature** : session non authentifiée.
- **Action** : naviguer directement vers `/recherche-application`.
- **Résultat attendu** : redirection vers la page de connexion Keycloak ; après connexion, retour
  sur le catalogue.

### NAV-08 — Navigation par onglets du bandeau

- **Action** : en étant connecté, cliquer successivement sur chaque lien du bandeau de navigation
  (Catalogue, Signalements, Qualité, Administration si admin).
- **Résultat attendu** : chaque clic charge la bonne page sans erreur console ; l'élément de
  navigation actif est visuellement distingué.

### NAV-09 — Gestion des signalements depuis la page dédiée

- **Action** : naviguer vers `/signalements`.
- **Résultat attendu** : `reports-page` visible ; `reports-tabs` affiche les onglets de signalements ;
  la table `issues-table` charge les signalements existants ; la recherche `issues-search-bar`
  filtre la liste.
