# Protocole de non-régression — Signalements & abonnements (`SIG-`)

> Signalements : page `/signalements` (`routeNames.REPORTS`) + onglet `tab-reports` d'une fiche.
> Abonnements : profil `/profil` (`routeNames.PROFILE`), onglet `user-profile-tab-follow`.
> Mails de dev visibles dans **Mailpit** (`http://localhost:8025`).

| Légende           |                                                         |
| :---------------- | :------------------------------------------------------ |
| **Automatisé** ✅ | `e2e/tests/signalements-abonnements.spec.ts`            |
| **Statut**        | ✅ 100 % des cas automatisés (POM strict + datafeature) |

---

### SIG-01 — Soumettre un signalement global ✅

- **Action** : depuis la recherche, `report-missing-app` (ou le point d'entrée de signalement global)
  → remplir → soumettre.
- **Résultat attendu** : toast de succès ; le signalement apparaît dans la liste.

### SIG-02 — Soumettre un signalement depuis une application ✅

- **Datafeature** : une application existante.
- **Action** : fiche → onglet `tab-reports` → créer un signalement.
- **Résultat attendu** : le signalement est rattaché à l'application.

### SIG-03 — Liste des signalements (mes / tous) ✅

- **Action** : aller sur `/signalements`.
- **Résultat attendu** : `reports-page` visible ; `reports-tabs` permet de basculer « Mes
  signalements » / « Tous » ; `issues-table` listée.

### SIG-04 — Recherche dans les signalements ✅

- **Action** : saisir un terme dans `issues-search-bar`.
- **Résultat attendu** : la table `issues-table` se filtre.

### SIG-05 — Gestion d'un signalement (statut / notes) par contributeur+ ✅

- **Datafeature** : utilisateur Contributeur+ et un signalement existant.
- **Action** : ouvrir un signalement, changer le statut, ajouter une note.
- **Résultat attendu** : statut/notes persistés ; `issues-row-*-status` reflète le nouveau statut.

### SIG-06 — S'abonner à une application ✅

- **Datafeature** : une application à laquelle l'utilisateur n'est pas encore abonné.
- **Action** : depuis la fiche, activer l'abonnement (ou via `my-apps-filter-toggle-subscribed`).
- **Résultat attendu** : l'application apparaît dans les abonnements du profil.

### SIG-07 — Se désabonner depuis le profil ✅

- **Datafeature** : un abonnement existant (créé par SIG-06 si besoin).
- **Action** : `/profil` → onglet `user-profile-tab-follow` → `user-unsubscribe-button`.
- **Résultat attendu** : l'application disparaît de `user-followed-apps-table`.

### SIG-08 — Onglet abonnements du profil ✅

- **Action** : `/profil` → onglet `user-profile-tab-follow`.
- **Résultat attendu** : `user-followed-apps-table` liste les applications suivies (ou état vide sans
  erreur).

### SIG-09 — Préférence de notifications email ✅

- **Action** : `/profil` → onglet informations → basculer
  `user-profile-email-notifications-checkbox`.
- **Résultat attendu** : la préférence est enregistrée et persiste après rechargement.

### SIG-10 — Notification email à la modification (Mailpit) ✅

- **Datafeature** : être abonné à une application.
- **Action** : modifier l'application abonnée, ouvrir Mailpit.
- **Résultat attendu** : un email d'alerte de modification est reçu pour l'abonné.
