# Protocole de non-régression — Détail d'une donnée applicative (`DAT-`)

> Page de détail d'une donnée (`/applications/:applicationId/data/:dataApplicationId`,
> `DataApplicationDetail`) et accès depuis l'onglet Sources de données de la fiche
> (`tab-data`, complète FIC-09). Données résolues via l'API ; un cas se `skip` si aucune application
> ne porte de donnée. Utilisateur par défaut : `admin` / `pass`.

| Légende           |                                                         |
| :---------------- | :------------------------------------------------------ |
| **Automatisé** ✅ | `e2e/tests/data-application.spec.ts`                    |
| **Statut**        | ✅ 100 % des cas automatisés (POM strict + datafeature) |

---

### DAT-01 — Le détail d'une donnée (URL directe) affiche ses champs ✅

- **Datafeature** : une application avec ≥ 1 donnée (résolue via l'API).
- **Action** : ouvrir directement `/applications/:id/data/:dataId`.
- **Résultat attendu** : le détail s'affiche (nom de la donnée + section « Informations de la
  donnée »).

### DAT-02 — Depuis l'onglet Sources de données, ouvrir le détail d'une donnée ✅

- **Datafeature** : une application avec ≥ 1 donnée.
- **Action** : ouvrir l'onglet `tab-data` d'une fiche puis cliquer le nom d'une donnée.
- **Résultat attendu** : navigation vers la page de détail de la donnée, qui s'affiche.

### DAT-03 — Le détail d'un identifiant inexistant affiche « Donnée introuvable » ✅

- **Datafeature** : une application existante (identifiant de donnée bidon).
- **Action** : ouvrir `/applications/:id/data/00000000-0000-0000-0000-000000000000`.
- **Résultat attendu** : l'alerte « Donnée introuvable » s'affiche.

### DAT-04 — Le bouton « Retour à la liste » revient à la fiche application ✅

- **Datafeature** : une application avec ≥ 1 donnée.
- **Action** : sur le détail d'une donnée, cliquer « Retour à la liste ».
- **Résultat attendu** : retour sur la fiche `/applications/:id`.

### DAT-05 — Le détail affiche la section « Usage dans l'application » ✅

- **Datafeature** : une application avec ≥ 1 donnée.
- **Action** : ouvrir le détail d'une donnée.
- **Résultat attendu** : la section « Usage dans l'application » est affichée.

### DAT-06 — Trier la table Données d'une application (colonnes Nom, Famille métier) ✅

- **Datafeature** : une application avec ≥ 1 donnée (résolue via l'API).
- **Action** : sur l'onglet Sources de données, cliquer successivement les en-têtes de colonne
  « Nom » puis « Famille métier » de la table Données.
- **Résultat attendu** : la table reste affichée avec au moins une ligne après chaque tri.

### DAT-07 — Rattacher une donnée existante du catalogue depuis l'onglet Données ✅

- **Datafeature** : une donnée de catalogue non rattachée, créée pour le test (nom unique), sur la
  première application du jeu de données.
- **Action** : ouvrir le modal d'ajout de donnée depuis l'onglet Données, rechercher la donnée par
  son nom (≥ 3 caractères) puis la sélectionner dans les suggestions, et valider le rattachement.
- **Résultat attendu** : la ligne de la donnée rattachée apparaît dans le tableau Données de la
  fiche (nom affiché).

### DAT-08 — Créer une nouvelle donnée de catalogue (nom + nouvelle famille inline + tag) et la rattacher ✅

- **Datafeature** : la première application du jeu de données et le premier tag disponible.
- **Action** : depuis l'onglet Données, ouvrir le modal d'ajout, basculer en mode « créer une
  nouvelle donnée », saisir un nom unique, créer une nouvelle famille métier inline (« + Créer une
  nouvelle famille »), ajouter un tag existant, puis valider.
- **Résultat attendu** : la ligne créée apparaît dans le tableau Données avec le nom saisi ET la
  famille métier créée.

### DAT-09 — Modifier la sensibilité d'une donnée rattachée depuis l'onglet Données ✅

- **Datafeature** : une application avec ≥ 1 donnée rattachée (résolue via l'API).
- **Action** : depuis l'onglet Données, ouvrir le modal d'édition de la donnée (le champ de
  recherche de donnée est verrouillé), choisir une sensibilité différente de la valeur actuelle,
  puis valider.
- **Résultat attendu** : la ligne de la donnée dans le tableau affiche le nouveau libellé de
  sensibilité.

### DAT-10 — Détacher une donnée depuis l'onglet Données ✅

- **Datafeature** : une donnée de catalogue créée puis rattachée à une application pour le test
  (jetable).
- **Action** : depuis l'onglet Données, cliquer le bouton « Détacher » de la ligne, puis confirmer
  dans la fenêtre de confirmation.
- **Résultat attendu** : la ligne de la donnée n'apparaît plus dans le tableau Données.

### DAT-11 — Modifier une donnée depuis la page de détail (statut open data) ✅

- **Datafeature** : une application avec ≥ 1 donnée rattachée (résolue via l'API).
- **Action** : sur la page de détail de la donnée, ouvrir le modal d'édition, sélectionner un
  statut open data différent de la valeur actuelle, puis valider.
- **Résultat attendu** : la section « Usage dans l'application » affiche le nouveau libellé de
  statut open data.

### DAT-12 — Détacher une donnée depuis la page de détail ✅

- **Datafeature** : une donnée de catalogue créée puis rattachée à une application pour le test
  (jetable).
- **Action** : sur la page de détail de la donnée, cliquer le bouton de détachement puis confirmer
  dans la fenêtre de confirmation.
- **Résultat attendu** : redirection vers l'onglet Données (`tab-data`) de la fiche application.
