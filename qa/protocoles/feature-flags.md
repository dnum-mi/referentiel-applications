# Protocole de non-régression — Feature flags (`FLG-`)

> Couvre le pilotage des fonctionnalités par feature flags (#2029) : l'écran d'administration
> `/administration` → onglet **Feature flags**, et l'effet d'un flag sur l'affichage des onglets
> (administration et fiche application) et sur les routes gouvernées. Utilisateur par défaut :
> `admin` / `pass`. Les flags sont un état serveur **global** : chaque bascule est mémorisée par la
> datafeature et restaurée par le teardown de la fixture (même après un timeout). La suite ne tourne
> que sur **chromium** (des projets navigateurs parallèles feraient entrer les bascules en collision).

| Légende           |                                                                |
| :---------------- | :------------------------------------------------------------- |
| **Automatisé** ✅ | tests Playwright dédiés dans `e2e/tests/feature-flags.spec.ts` |
| **Statut**        | 🟢 automatisé — 5 cas couverts par la CI                       |

---

### FLG-01 — L'admin voit chaque flag du catalogue partagé ✅

- **Datafeature** : lecture `GET /feature-flags` (skip si l'endpoint est indisponible).
- **Action** : administration → onglet **Feature flags**.
- **Résultat attendu** : chaque clé du miroir front (`frontend/src/constants/feature-flags.ts`)
  est listée avec son toggle — une dérive entre le miroir front et le catalogue backend fait
  échouer ce cas.

### FLG-02 — Désactiver un flag masque son onglet d'administration ✅

- **Datafeature** : flag `api-tokens` (feature non couverte par un autre test) ; état restauré à
  activé en fin de test.
- **Action** : onglet **Feature flags** → basculer `api-tokens` sur off via le toggle, puis à nouveau
  sur on.
- **Résultat attendu** : l'onglet « Gestion des tokens » disparaît de la barre d'administration quand
  le flag est off, et réapparaît quand il est réactivé.

### FLG-03 — Désactiver un flag masque l'onglet correspondant de la fiche application ✅

- **Datafeature** : une application du catalogue ; flag `technology-stack` désactivé via l'API puis
  restauré par le teardown de la fixture.
- **Action** : ouvrir la fiche application (onglet « Stack technique » présent), désactiver
  `technology-stack`, recharger la fiche.
- **Résultat attendu** : après rechargement, l'onglet « Stack technique » n'est plus présent dans la
  barre d'onglets de la fiche.

### FLG-04 — Un flag désactivé redirige la route gouvernée vers l'accueil ✅

- **Datafeature** : flag `reports` désactivé via l'API puis restauré par le teardown de la fixture.
- **Action** : ouvrir `/signalements` (accessible flag actif), désactiver `reports`, recharger
  `/signalements`.
- **Résultat attendu** : la garde de route (`meta.requiresFeature`) redirige vers l'accueil (`/`).

### FLG-05 — L'onglet Feature flags est réservé à l'administrateur global ✅

- **Datafeature** : compte `scope-admin` promu admin **scopé** sur une organisation jetable via
  l'API (état d'origine mémorisé et restauré en fin de test ; organisation supprimée).
- **Action** : connexion `scope-admin` dans un contexte navigateur séparé → `/administration`.
- **Résultat attendu** : le panneau admin est accessible (onglet « Gestion des utilisateurs »
  visible) mais l'onglet « Feature flags » est absent ; côté API, `GET`/`PATCH /feature-flags`
  renvoient 403 pour un admin scopé (le feature flipping est global, réservé à l'admin global).
