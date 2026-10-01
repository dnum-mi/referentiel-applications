# Protocole de non-régression — Pages transverses (`TRV-`)

> Pages utilitaires & transverses : plan du site (`/plan-du-site`), accessibilité (`/accessibilite`)
> et page « 404 » (route inconnue). Cas légers de non-régression de la navigation. Utilisateur par
> défaut connecté : `admin` / `pass`.

| Légende           |                                           |
| :---------------- | :---------------------------------------- |
| **Automatisé** ✅ | `e2e/tests/transverse.spec.ts`            |
| **Statut**        | ✅ 100 % des cas automatisés (POM strict) |

---

### TRV-01 — Le plan du site se charge ✅

- **Datafeature** : aucune (session vierge).
- **Action** : ouvrir `/plan-du-site`.
- **Résultat attendu** : le titre « Plan du site » est visible et au moins un lien public est listé.

### TRV-02 — Un lien public du plan du site navigue vers sa page ✅

- **Datafeature** : aucune (session vierge).
- **Action** : sur le plan du site, cliquer le lien « Accessibilité » de la liste publique.
- **Résultat attendu** : navigation vers `/accessibilite`.

### TRV-03 — Le plan du site connecté liste l'espace connecté ✅

- **Datafeature** : session `admin`.
- **Action** : ouvrir `/plan-du-site` connecté.
- **Résultat attendu** : la section « Espace connecté » et ses liens protégés sont présents.

### TRV-04 — La page Accessibilité se charge ✅

- **Datafeature** : aucune (session vierge).
- **Action** : ouvrir `/accessibilite`.
- **Résultat attendu** : le titre « Accessibilité » est visible.

### TRV-05 — Une route inconnue affiche la page « non trouvée » ✅

- **Datafeature** : aucune (session vierge).
- **Action** : ouvrir une URL inexistante.
- **Résultat attendu** : la page « 404 » s'affiche (texte « 404 » / « introuvable »).

### TRV-06 — La page 404 ramène au catalogue (connecté) ✅

- **Datafeature** : session `admin`.
- **Action** : sur la page 404, cliquer « Retour à l'accueil ».
- **Résultat attendu** : navigation vers `/recherche-application`.

### TRV-07 — La page Accessibilité affiche ses sections ✅

- **Datafeature** : aucune (session vierge).
- **Action** : ouvrir `/accessibilite`.
- **Résultat attendu** : les sections « Déclaration d'accessibilité » et « État de conformité » sont
  visibles.

### TRV-08 — La page « Technologies » liste les applications concernées, et toutes leurs technologies avec le filtre « Toutes » ✅

- **Datafeature** : session `admin`, seed QA (`pnpm db:seed:qa`) — l'application `QA-EOL` porte une
  technologie dont la fin de vie est dépassée, une proche, une hors support actif, une saisie à la
  main, et une **saine** (Vue.js, aucune fin de vie connue).
- **Action** : ouvrir `/fins-de-vie` depuis le menu « Technologies » ; filtrer sur « Fin de vie
  dépassée », puis sur « Sortie du support actif », puis sur « Toutes les technologies (y compris à
  jour) » ; cliquer le nom d'une application de la liste.
- **Résultat attendu** : la page s'intitule « Technologies » (h1 aligné sur le menu, #2413) ; le
  tableau liste les applications concernées, chacune avec ses technologies en fin de vie (badge de
  statut, produit, version, date) ; le filtre de statut restreint la liste et le compteur de
  résultats est annoncé ; avec « Toutes les technologies », `QA-EOL` reste listée et sa technologie
  saine (Vue.js) apparaît dans le tableau, sans badge de gravité ; le lien ouvre l'onglet
  « Technologies » de la fiche.

### TRV-09 — La page « Technologies » sélectionne toutes les technologies par défaut ✅

- **Datafeature** : session `admin`, seed QA (`pnpm db:seed:qa`) — l'application `QA-EOL` porte une
  technologie **saine** (Vue.js, aucune fin de vie connue).
- **Action** : ouvrir `/fins-de-vie` sans toucher aux filtres.
- **Résultat attendu** : le filtre « Statut » affiche « Toutes les technologies (y compris à jour) »
  (#2798) ; la requête de chargement porte `status=all` ; `QA-EOL` est listée avec sa technologie
  saine (Vue.js) ; le compteur de résultats est annoncé.

### TRV-10 — « Effacer les filtres » ramène la page « Technologies » à toutes les technologies ✅

- **Datafeature** : session `admin`, seed QA (`pnpm db:seed:qa`) — `QA-EOL` porte une technologie en
  fin de vie dépassée et une technologie saine (Vue.js).
- **Action** : ouvrir `/fins-de-vie` ; filtrer sur « Fin de vie dépassée » ; cliquer « Effacer les
  filtres ».
- **Résultat attendu** : avec « Fin de vie dépassée », Vue.js n'apparaît pas sur la ligne `QA-EOL` ;
  après « Effacer les filtres », le filtre « Statut » revient à « Toutes les technologies (y compris
  à jour) » (#2798) et Vue.js réapparaît.
