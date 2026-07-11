# Protocole de non-régression — Fiche application (`FIC-`)

> Route : `/applications/:id/:tab?` (`routeNames.PROFILEAPP`). L'onglet est piloté par le `tabId`
> dans l'URL (`/applications/:id/tab-actors`). Utilisateur par défaut : `admin` / `pass`.

| Légende           |                                                         |
| :---------------- | :------------------------------------------------------ |
| **Automatisé** ✅ | `e2e/tests/fiche-application.spec.ts`                   |
| **Statut**        | ✅ 100 % des cas automatisés (POM strict + datafeature) |

---

### FIC-01 — Ouverture de la fiche (titre + tags) ✅

- **Datafeature** : 1ʳᵉ application existante.
- **Action** : ouvrir `/applications/:id`.
- **Résultat attendu** : `application-profile` visible ; `application-title` non vide ; tags
  `application-status-tag`, `application-iq-tag`, `application-type-tag` présents.

### FIC-02 — Onglet Informations générales ✅

- **Action** : onglet `tab-infos`.
- **Résultat attendu** : `informations-generales` affiche ID, description, finalités, populations,
  tags, priorité de redémarrage (R0–R3), hébergements et labels.

### FIC-03 — Onglet Acteurs ✅

- **Datafeature** : application existante (idéalement avec acteurs).
- **Action** : onglet `tab-actors`.
- **Résultat attendu** : `actor-tab` visible ; la table des acteurs OU `actor-empty-state` s'affiche
  (pas d'erreur).

### FIC-04 — Onglet Statuts / cycle de vie ✅

- **Action** : onglet `tab-statuses`.
- **Résultat attendu** : `statuses-table` (ou `statuses-empty`) visible ; l'historique des statuts est
  lisible.

### FIC-05 — Onglet Conformités (6 axes) ✅

- **Action** : onglet `tab-compliances`.
- **Résultat attendu** : les axes DIMA, PDMA, homologation SSI, RGPD, DSFR, EcoIndex sont présentés
  (`compliance-table` ou cartes `compliance-card-*`).

### FIC-06 — Axe RGAA ✅

- **Action** : onglet `tab-compliances` → carte/ligne RGAA (`compliance-card-RGAA`).
- **Résultat attendu** : le détail RGAA (taux de conformité) est consultable.

### FIC-07 — Onglet Relations (graphe + navigation) ✅

- **Datafeature** : application ayant ≥ 1 relation (sinon skip).
- **Action** : onglet `tab-relations`.
- **Résultat attendu** : `relations-table` listée ; un `relation-target-link` mène vers l'app cible.

### FIC-08 — Onglet Liens externes ✅

- **Action** : onglet `tab-links`.
- **Résultat attendu** : `links-table` (ou `links-empty`) visible ; les liens s'ouvrent correctement.

### FIC-09 — Onglet Sources de données ✅

- **Action** : onglet `tab-data`.
- **Résultat attendu** : `data-application-table` visible ; les expositions de données sont listées.

### FIC-10 — Onglet Qualité (IQ détaillé) ✅

- **Action** : onglet `tab-quality`.
- **Résultat attendu** : `quality-index` affiché ; les sections générale / acteurs / conformités
  détaillent la complétude (`quality-dima`, `quality-rgaa`, etc.).

### FIC-11 — Navigation par onglet via l'URL ✅

- **Action** : ouvrir directement `/applications/:id/tab-statuses` puis changer d'onglet.
- **Résultat attendu** : l'onglet ciblé est actif ; l'URL reflète le `tabId` courant.

### FIC-12 — Copier le lien de la fiche ✅

- **Action** : cliquer `application-copy-link-btn`.
- **Résultat attendu** : un toast de confirmation ; le presse-papier contient l'URL de la fiche.

### FIC-13 — Onglet Signalements de l'application ✅

- **Action** : onglet `tab-reports`.
- **Résultat attendu** : les signalements rattachés à l'application sont listés.

### FIC-14 — Onglet Modifications (historique) ✅

- **Action** : onglet `tab-modifications`.
- **Résultat attendu** : l'historique d'audit (qui/quoi/quand) de l'application est affiché.

### FIC-15 — Onglet Informations générales : libellé « Maîtrise des coûts » ✅

- **Action** : sur une application disposant d'une évaluation de dette technique, ouvrir l'onglet `tab-infos` et consulter la carte « Dette technique ».
- **Résultat attendu** : la troisième dimension est libellée **« Maîtrise des coûts »** (renommée depuis « Maturité des coûts », cf. ticket #1900) ; l'ancien libellé n'apparaît plus.

### FIC-16 — Onglet Informations générales : score non noté ✅

- **Action** : sur une application dont un axe de maturité n'est pas renseigné (`null`, p. ex. maîtrise des coûts), ouvrir l'onglet `tab-infos` et consulter la carte « Dette technique ».
- **Résultat attendu** : le badge de l'axe affiche **« Non notée »** (et non « 0/5 »). L'échelle est désormais 1-5 ; toute valeur < 1 est traitée comme non notée (`null`), cf. ticket #1900.

### FIC-21 — Onglet Informations générales : clic sur un tag → navigation filtrée ✅

- **Datafeature** : application avec ≥ 1 tag (create-if-absent si nécessaire).
- **Action** : sur l'onglet `tab-infos`, cliquer un tag de la liste `info-tags`.
- **Résultat attendu** : navigation vers `/recherche-application?tag=<valeur>` avec le paramètre
  `tag` égal à la valeur du tag cliqué (cf. ticket #1967, tags devenus cliquables). Ne duplique pas
  CSF-16 (`catalogue-filtres.md`) qui couvre déjà le filtrage réel des résultats côté page de
  recherche ; ce cas vérifie uniquement le trajet clic (fiche) → navigation (URL avec le bon
  paramètre tag).
