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

- **Datafeature** : session `admin` avec capacité `TechnologyList` explicitement accordée, seed QA (`pnpm db:seed:qa`) — l'application `QA-EOL` porte une
  technologie dont la fin de vie est dépassée, une proche, une hors support actif, une saisie à la
  main, et une **saine** (Vue.js, aucune fin de vie connue).
- **Action** : ouvrir `/fins-de-vie` depuis le menu « Technologies » ; filtrer sur « Fin de vie
  dépassée », puis sur « Sortie du support actif », puis sur « Toutes les technologies (y compris à
  jour) » ; cliquer le nom d'une application de la liste.
- **Résultat attendu** : la page s'intitule « Technologies » (h1 aligné sur le menu, #2413) ; le filtre
  « Toutes les technologies (y compris à jour) » est sélectionné dès l'ouverture et la technologie
  saine Vue.js est visible. Le tableau liste les applications autorisées, avec leurs technologies (badge de
  statut, produit, version, date) ; le filtre de statut restreint la liste et le compteur de
  résultats est annoncé ; avec « Toutes les technologies », `QA-EOL` reste listée et sa technologie
  saine (Vue.js) apparaît dans le tableau, sans badge de gravité ; le lien ouvre l'onglet
  « Technologies » de la fiche.

### TRV-09 — La capacité et le périmètre bornent la vue Technologies (#2801)

- **Datafeature** : profils lecture, écriture et administration ; chacun avec puis sans capacité
  `TechnologyList`, avec un périmètre A puis sans périmètre. Applications rattachées à A, à un
  descendant, à une direction métier de A, à une organisation extérieure et à un faux préfixe de A.
- **Action** : ouvrir le menu, le plan du site et `/fins-de-vie` directement ; rechercher une
  application extérieure, filtrer sur son organisation puis paginer. Retirer la capacité ou modifier
  le périmètre et actualiser les droits de la session.
- **Résultat attendu** : sans capacité, aucun accès, même pour un administrateur global ; l'API
  renvoie 403. Avec capacité et périmètre, seuls A et ses descendants sont retenus via les acteurs
  ou les directions métier. Sans périmètre, les trois profils voient toutes les applications
  éligibles. Les filtres et les compteurs n'élargissent pas les droits. Les anciennes données et
  réponses en attente ne réapparaissent pas après un changement de droits.
- **Limites de cette version** : aucun accès pour `VISITOR` ; les droits d'acteur hors périmètre
  n'élargissent pas la vue. Les droits de l'onglet Technologies des fiches restent inchangés.
