# Protocole de non-régression — Historique global & détail des modifications (`HIS-`)

> Page `/historique` (`HistoryPage`, titre « Modifications ») : journal global des modifications
> (metadatas) avec filtres de dates et accès au détail, et page de détail `/metadatas/:id`
> (`MetadataDetailPage`). Complète l'onglet Modifications de la fiche (FIC-14). Utilisateur par
> défaut : `admin` / `pass`.

| Légende           |                                                         |
| :---------------- | :------------------------------------------------------ |
| **Automatisé** ✅ | `e2e/tests/historique.spec.ts`                          |
| **Statut**        | ✅ 100 % des cas automatisés (POM strict + datafeature) |

---

### HIS-01 — La page Modifications se charge ✅

- **Datafeature** : aucune (session `admin`).
- **Action** : ouvrir `/historique`.
- **Résultat attendu** : le titre « Modifications » est visible et la page affiche soit la table de
  modifications, soit l'état vide.

### HIS-02 — La liste affiche au moins une modification ✅

- **Datafeature** : ≥ 1 entrée dans le journal des modifications.
- **Action** : ouvrir `/historique`.
- **Résultat attendu** : la table `history-table` est visible et comporte au moins une ligne.

### HIS-03 — Filtre par dates futures vide la liste puis l'effacement la rétablit ✅

- **Datafeature** : ≥ 1 entrée dans le journal des modifications.
- **Action** : renseigner une période future (2099) dans les filtres puis « Appliquer » ; ensuite
  « Effacer ».
- **Résultat attendu** : l'état vide « Aucune donnée recensée » s'affiche sur la période future ;
  après effacement, la table se re-remplit.

### HIS-04 — « Voir plus » ouvre le détail d'une modification ✅

- **Datafeature** : ≥ 1 entrée dans le journal des modifications.
- **Action** : cliquer « Voir plus » sur la première ligne.
- **Résultat attendu** : navigation vers `/metadatas/:id` ; le détail affiche type, auteur, date et
  description.

### HIS-05 — Le détail d'une modification (URL directe) affiche ses champs ✅

- **Datafeature** : une entrée de modification (id résolu via l'API).
- **Action** : ouvrir directement `/metadatas/:id`.
- **Résultat attendu** : la page « Détails de la modification » affiche type, auteur, date et
  description.

### HIS-06 — Le bouton « Retour à l'historique » revient à la liste ✅

- **Datafeature** : ≥ 1 entrée dans le journal des modifications.
- **Action** : depuis le détail ouvert via « Voir plus », cliquer « Retour à l'historique ».
- **Résultat attendu** : retour sur `/historique`.

### HIS-07 — Le détail renvoie vers la fiche application liée ✅

- **Datafeature** : une entrée de modification rattachée à une application.
- **Action** : sur le détail, cliquer le lien vers l'application.
- **Résultat attendu** : navigation vers la fiche `/applications/:id`. (Cas `skipped` si la
  modification n'est pas rattachée à une application.)

### HIS-08 — Le détail d'un identifiant inexistant affiche une erreur ✅

- **Datafeature** : aucune (session `admin`).
- **Action** : ouvrir `/metadatas/00000000-0000-0000-0000-000000000000`.
- **Résultat attendu** : un message d'erreur ou « Aucune metadata trouvée » s'affiche.

### HIS-09 — Le tri par colonne recharge la liste ✅

- **Datafeature** : ≥ 1 entrée dans le journal des modifications.
- **Action** : cliquer l'en-tête de la colonne « Application ».
- **Résultat attendu** : la table est rechargée (tri serveur) et reste affichée avec ses lignes, sans
  erreur.

### HIS-10 — « Voir plus » depuis l'onglet Modifications d'une fiche ouvre le détail ✅

- **Datafeature** : 1ʳᵉ application ayant au moins une modification.
- **Action** : ouvrir l'onglet `tab-modifications` d'une fiche puis cliquer « Voir plus ».
- **Résultat attendu** : navigation vers `/metadatas/:id` ; le détail s'affiche. (Cas `skipped` si
  l'application n'a aucune modification.)
