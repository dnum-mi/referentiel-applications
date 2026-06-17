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
