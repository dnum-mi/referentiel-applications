# Protocole de non-régression — Navigation globale & pages statiques (`NAV-`)

> Couvre les parcours de navigation transversaux (accueil, plan du site, accessibilité, erreur 404),
> le bandeau applicatif (connexion, déconnexion, liens de navigation) et les gardes de route. Ces
> tests vérifient que l'ossature de l'application ne régresse pas. Utilisateur par défaut :
> `admin` / `pass`.

| Légende           |                                                                     |
| :---------------- | :------------------------------------------------------------------ |
| **Automatisé** ✅ | tests Playwright dédiés dans `e2e/tests/navigation-globale.spec.ts` |
| **Statut**        | 🟢 automatisé — 9 cas couverts par la CI                            |

---

### NAV-01 — Charger la page d'accueil ✅

- **Action** : naviguer vers `/`.
- **Résultat attendu** : `home-title` affiche « Le référentiel des applications » ; les tuiles
  objectifs sont visibles (`home-tile-centralisation`, `home-tile-access`, etc.) ; le lien de contact
  (`home-contact-link`) est présent.

### NAV-02 — Lien « Se connecter » → Keycloak → retour authentifié ✅

- **Datafeature** : session non authentifiée.
- **Action** : page d'accueil → lien « Se connecter » → saisir identifiants sur Keycloak → valider.
- **Résultat attendu** : redirection vers l'application ; le bandeau affiche « Mon profil » ou
  « Déconnexion » à la place de « Se connecter ».

### NAV-03 — Déconnexion ✅

- **Action** : cliquer « Déconnexion » dans le bandeau.
- **Résultat attendu** : retour sur la page d'accueil ou la page de connexion ; le bandeau affiche de
  nouveau « Se connecter ».

### NAV-04 — Page plan du site ✅

- **Action** : naviguer vers `/plan-du-site`.
- **Résultat attendu** : la page charge sans erreur ; les sections « Pages publiques » et
  « Espace connecté » sont présentes ; au moins un lien de navigation est visible.

### NAV-05 — Page accessibilité ✅

- **Action** : naviguer vers `/accessibilite`.
- **Résultat attendu** : la page charge sans erreur ; le titre « Accessibilité » est affiché.

### NAV-06 — Page 404 (route inconnue) ✅

- **Action** : naviguer vers `/route-qui-nexiste-pas-e2e`.
- **Résultat attendu** : la page 404 s'affiche avec un message d'erreur explicite et un bouton
  « Retour à l'accueil » (`not-found-home-btn`).

### NAV-07 — Accès non authentifié au catalogue → redirection login ✅

- **Datafeature** : session non authentifiée.
- **Action** : naviguer directement vers `/recherche-application`.
- **Résultat attendu** : redirection vers la page de connexion Keycloak.

### NAV-08 — Navigation par onglets du bandeau ✅

- **Action** : en étant connecté, cliquer successivement sur les liens du bandeau (Catalogue →
  Signalements → Qualité).
- **Résultat attendu** : chaque clic charge la bonne page sans erreur.

### NAV-09 — Gestion des signalements depuis la page dédiée ✅

- **Action** : naviguer vers `/signalements`.
- **Résultat attendu** : `reports-page` visible ; `reports-tabs` affiche les onglets de signalements ;
  `issues-table` charge les signalements existants ; `issues-search-bar` est accessible.
