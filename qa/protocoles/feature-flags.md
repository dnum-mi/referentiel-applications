# Protocole de non-régression — Feature flags (`FLG-`)

> Couvre le pilotage des fonctionnalités par feature flags (#2029) : l'écran d'administration
> `/administration` → onglet **Feature flags**, et l'effet d'un flag sur l'affichage des onglets
> (administration et fiche application). Utilisateur par défaut : `admin` / `pass`. Les flags sont un
> état **global** : chaque test qui en bascule un le restaure via l'API en fin de test.

| Légende           |                                                                |
| :---------------- | :------------------------------------------------------------- |
| **Automatisé** ✅ | tests Playwright dédiés dans `e2e/tests/feature-flags.spec.ts` |
| **Statut**        | 🟢 automatisé — 3 cas couverts par la CI                       |

---

### FLG-01 — L'admin voit la liste des feature flags ✅

- **Datafeature** : lecture `GET /feature-flags` (skip si l'endpoint est indisponible).
- **Action** : administration → onglet **Feature flags**.
- **Résultat attendu** : la liste des flags est affichée ; les flags `mdit-campaigns` et
  `technology-stack` y figurent avec leur toggle.

### FLG-02 — Désactiver un flag masque son onglet d'administration ✅

- **Datafeature** : flag `api-tokens` (feature non couverte par un autre test) ; état restauré à
  activé en fin de test.
- **Action** : onglet **Feature flags** → basculer `api-tokens` sur off via le toggle, puis à nouveau
  sur on.
- **Résultat attendu** : l'onglet « Gestion des tokens » disparaît de la barre d'administration quand
  le flag est off, et réapparaît quand il est réactivé.

### FLG-03 — Désactiver un flag masque l'onglet correspondant de la fiche application ✅

- **Datafeature** : une application du catalogue ; flag `technology-stack` désactivé via l'API puis
  restauré à activé en fin de test.
- **Action** : ouvrir la fiche application (onglet « Stack technique » présent), désactiver
  `technology-stack`, recharger la fiche.
- **Résultat attendu** : après rechargement, l'onglet « Stack technique » n'est plus présent dans la
  barre d'onglets de la fiche.
