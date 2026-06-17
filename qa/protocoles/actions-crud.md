# Protocole de non-régression — Actions CRUD de base (`CRU-`)

> Complète `fiche-application.md`, qui ne couvre que la **consultation** des onglets. Ici on ferme la
> boucle écriture → lecture : créer / modifier / supprimer une donnée de base et vérifier qu'elle est
> bien répercutée dans les listes et tableaux qui l'affichent. Route principale : fiche application
> `/applications/:id/:tab?`. Utilisateur par défaut : `admin` / `pass`.

| Légende           |                                                               |
| :---------------- | :------------------------------------------------------------ |
| **Automatisé** ✅ | tests Playwright dédiés dans `e2e/tests/actions-crud.spec.ts` |
| **Statut**        | 🟢 automatisé — 15 cas couverts par la CI                     |

---

### CRU-01 — Modifier un acteur existant et vérifier la liste ✅

- **Datafeature** : une application ayant au moins un acteur (sinon en créer un via `actor-add-btn`).
- **Action** : onglet `tab-actors` → `actor-edit-btn` sur une ligne → changer `actor-firstname-input`
  et `actor-lastname-input` → `actor-submit-btn`.
- **Résultat attendu** : toast « Acteur sauvegardé avec succès » ; la ligne dans `actor-table` affiche
  immédiatement les nouvelles valeurs (pas besoin de recharger la page).

### CRU-02 — Supprimer un acteur, seul puis par sélection multiple ✅

- **Datafeature** : une application avec ≥ 2 acteurs.
- **Action** : cocher `actor-row-select-*` sur une ligne → `actor-bulk-delete-btn` → confirmer dans
  `actor-delete-modal` ; répéter en sélectionnant plusieurs lignes à la fois.
- **Résultat attendu** : toast de succès ; les acteurs supprimés disparaissent de `actor-table` ;
  `actor-empty-state` s'affiche si la liste devient vide.

### CRU-03 — Créer un acteur « groupe » ✅

- **Action** : `actor-add-btn` → cocher `actor-is-group-checkbox` → renseigner type d'acteur +
  organisation (pas de prénom/nom) → `actor-submit-btn`.
- **Résultat attendu** : les champs prénom/nom sont masqués pendant la saisie ; la ligne créée affiche
  `Groupe = Oui` dans `actor-table`.

### CRU-04 — Droits d'écriture sur les acteurs ✅

- **Datafeature** : utilisateur sans la permission `ACTOR_WRITE` sur l'application (ex. Lecteur, non
  acteur).
- **Action** : ouvrir `tab-actors`.
- **Résultat attendu** : `actor-add-btn`, `actor-edit-btn` et `actor-bulk-delete-btn` sont visibles
  mais désactivés.

### CRU-05 — Modifier les informations générales et vérifier la répercussion ✅

- **Datafeature** : une application existante, utilisateur avec `AppWrite`.
- **Action** : onglet `tab-infos` → `info-edit-btn` → modifier `application-label`,
  `application-description` et `application-priority-restart` → enregistrer.
- **Résultat attendu** : toast de succès ; les nouvelles valeurs s'affichent sur la fiche ; le nouveau
  libellé est retrouvé en recherchant dans le catalogue (`application-filter-label`, voir CAT-03).

### CRU-06 — Ajouter / retirer une finalité et une population cible ✅

- **Action** : dans le formulaire d'édition des informations, `application-purpose-add` puis
  `application-purpose-remove-*` ; idem pour les populations (`application-population-add` /
  `-remove-*`).
- **Résultat attendu** : la liste de finalités/populations affichée sur la fiche reflète les ajouts et
  retraits, sans doublon ni entrée fantôme après enregistrement.

### CRU-07 — Modifier les acteurs MOA / MOE ✅

- **Action** : dans le formulaire d'informations générales, modifier `application-moa-organization`,
  `application-moa-email` (ou MOE) puis enregistrer.
- **Résultat attendu** : la fiche affiche les nouvelles coordonnées MOA/MOE ; persiste après
  rechargement.

### CRU-08 — Créer une application de bout en bout ✅

- **Datafeature** : utilisateur avec la permission `CreateApplication`.
- **Action** : `/applications/creer` → `create-application-form` → remplir libellé, description,
  statut, type → `application-submit-btn`.
- **Résultat attendu** : redirection vers la fiche de la nouvelle application ; elle apparaît dans le
  catalogue (`/recherche-application`) en la recherchant par son libellé.

### CRU-09 — Supprimer une application ✅

- **Datafeature** : une application de test créée par CRU-08 (éviter de supprimer une donnée réelle).
- **Action** : sur la fiche, `application-delete-btn` → confirmer en saisissant le nom dans
  `application-delete-input` → valider (`application-delete-modal`).
- **Résultat attendu** : redirection hors de la fiche ; l'application n'apparaît plus dans le
  catalogue ni en recherche directe par son libellé.

### CRU-10 — Cycle de vie d'un hébergement (créer / modifier / supprimer) ✅

- **Action** : onglet `tab-infos` → ajouter un hébergement → le modifier (`hosting-edit-btn`) → le
  supprimer (`hosting-delete-btn`).
- **Résultat attendu** : chaque étape se répercute immédiatement dans la liste des hébergements de la
  fiche, sans rechargement manuel.

### CRU-11 — Cycle de vie d'un nom alternatif (label) ✅

- **Action** : créer un nom alternatif sur la fiche, le modifier (`label-edit-btn`), le supprimer
  (`label-delete-btn`).
- **Résultat attendu** : le nom alternatif créé permet de retrouver l'application dans le catalogue en
  le recherchant via `application-filter-label` ; il disparaît de la recherche une fois supprimé.

### CRU-12 — Cycle de vie d'un statut (cycle de vie applicatif) ✅

- **Action** : onglet `tab-statuses` → `add-status-btn` → créer un statut → `status-edit-btn` pour le
  modifier → `status-delete-btn` pour le supprimer.
- **Résultat attendu** : `statuses-table` reflète l'historique à chaque étape ; si le statut ajouté est
  le plus récent, `application-status-tag` sur l'en-tête de la fiche se met à jour en conséquence.

### CRU-13 — Cycle de vie d'une relation entre applications ✅

- **Datafeature** : deux applications existantes, A et B.
- **Action** : sur A, ajouter une relation vers B ; modifier le type de relation (`relation-edit-btn`)
  ; puis la supprimer (sélection + `relation-delete-selected-btn`).
- **Résultat attendu** : la relation apparaît dans `relations-table` de **A et de B** (sens direct et
  inverse) ; sa suppression la retire des deux côtés.

### CRU-14 — Cycle de vie d'un lien externe ✅

- **Action** : onglet `tab-links` → `link-add-btn` → créer un lien → `link-edit-btn` pour le modifier
  → `link-delete-btn` pour le supprimer.
- **Résultat attendu** : `links-table` reflète chaque étape ; le lien créé/modifié (`link-item`) ouvre
  bien l'URL renseignée dans un nouvel onglet.

### CRU-15 — Cycle de vie d'une déclaration RGAA ✅

- **Action** : onglet `tab-compliances` → carte RGAA → `rgaa-add-btn` → créer une déclaration →
  `rgaa-edit-btn` pour la modifier → `rgaa-delete-btn` pour la supprimer.
- **Résultat attendu** : le taux de conformité RGAA affiché (`compliance-card-RGAA`) se met à jour
  après chaque modification ; la déclaration supprimée n'apparaît plus dans la liste.
