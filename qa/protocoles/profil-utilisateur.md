# Protocole de non-régression — Profil utilisateur (`PRF-`)

> Couvre la page `/profil` (onglets Informations, Tokens API, Applications suivies) et les
> interactions utilisateur liées au compte connecté. Utilisateur par défaut : `admin` / `pass`.

| Légende           |                                                                     |
| :---------------- | :------------------------------------------------------------------ |
| **Automatisé** ✅ | tests Playwright dédiés dans `e2e/tests/profil-utilisateur.spec.ts` |
| **Statut**        | 🟢 automatisé — 6 cas couverts par la CI                            |

---

### PRF-01 — Accéder à la page profil et vérifier les informations ✅

- **Action** : cliquer sur « Mon profil » dans le bandeau → `/profil`.
- **Résultat attendu** : `user-profile` visible ; `user-profile-table` affiche l'organisation et
  l'email de l'utilisateur connecté (`user-profile-organization`, `user-profile-email`).

### PRF-02 — Activer / désactiver les notifications email ✅

- **Action** : onglet Informations → cocher `user-profile-email-notifications-checkbox` → vérifier ;
  décocher → vérifier.
- **Résultat attendu** : le toggle reflète l'état courant ; un PATCH `/users/me` confirme chaque
  changement ; l'état persiste après rechargement de la page.

### PRF-03 — Lister les applications suivies ✅

- **Datafeature** : l'utilisateur est abonné à au moins une application (s'abonne via l'API).
- **Action** : onglet « Mes abonnements » (`user-profile-tab-follow`).
- **Résultat attendu** : `user-followed-apps-table` liste les applications auxquelles l'utilisateur est
  abonné ; chaque ligne comporte un bouton de désabonnement (`user-unsubscribe-button`).

### PRF-04 — Se désabonner d'une application depuis le profil ✅

- **Datafeature** : l'utilisateur est abonné à au moins une application.
- **Action** : onglet « Mes abonnements » → `user-unsubscribe-button` sur une ligne.
- **Résultat attendu** : l'application disparaît de `user-followed-apps-table` ; en ouvrant la fiche
  de cette application, le bouton affiche « S'abonner » (et non « Abonné »).

### PRF-05 — Onglet Tokens API (présence) ✅

- **Action** : onglet « Mes tokens » (`user-profile-tab-tokens`).
- **Résultat attendu** : le panneau s'affiche ; le titre « Tokens applicatifs » est visible ; la liste
  des tokens est visible (vide ou non).

### PRF-06 — Navigation aller-retour profil ↔ fiche application ✅

- **Datafeature** : l'utilisateur est abonné à au moins une application.
- **Action** : depuis le profil, onglet « Mes abonnements » → cliquer le lien d'une application
  → vérifier l'ouverture de la fiche → retour au profil via navigation.
- **Résultat attendu** : chaque navigation charge la bonne page sans erreur ; le profil reste
  accessible après le retour.
