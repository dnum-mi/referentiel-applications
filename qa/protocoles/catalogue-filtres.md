# Protocole de non-régression — Catalogue : filtres avancés (`CSF-`)

> Page `/recherche-application` (`SearchPage`). Complète CAT (CAT-01..17) avec les **filtres avancés
> de la sidebar** non couverts (qualité, hébergement, conformité, priorité, acteurs, données…). Chaque
> filtre est validé par sa **propagation dans l'URL**. Utilisateur par défaut : `admin` / `pass`.

| Légende           |                                                           |
| :---------------- | :-------------------------------------------------------- |
| **Automatisé** ✅ | `e2e/tests/catalogue-filtres.spec.ts`                     |
| **Statut**        | ✅ 100 % des cas automatisés (POM strict, assertions URL) |

---

### CSF-01 — Filtre Qualité IQ min/max reflété dans iqGte/iqLte ✅

- **Datafeature** : aucune (propagation URL).
- **Action** : accordéon Qualité → saisir IQ minimum puis maximum.
- **Résultat attendu** : l'URL porte `iqGte` et `iqLte` aux valeurs saisies.

### CSF-02 — Décocher « Sans statut » pose currentStatus\_\_isNull=false ✅

- **Datafeature** : aucune (propagation URL).
- **Action** : accordéon Statut → décocher « Sans statut » (cochée par défaut).
- **Résultat attendu** : l'URL porte `currentStatus__isNull=false`.

### CSF-03 — Filtre « Sans hébergement » reflété dans missingHosting ✅

- **Datafeature** : aucune (propagation URL).
- **Action** : accordéon Hébergement → cocher « Sans hébergement ».
- **Résultat attendu** : l'URL porte `missingHosting=true`.

### CSF-04 — Filtre Priorité de redémarrage reflété dans priorityRestart ✅

- **Datafeature** : aucune (propagation URL).
- **Action** : accordéon Général → cocher une priorité de redémarrage (R0).
- **Résultat attendu** : l'URL porte `priorityRestart` contenant la valeur cochée.

### CSF-05 — Filtre Conformité « Présent » reflété dans compliancePresent\_\_in ✅

- **Datafeature** : aucune (propagation URL).
- **Action** : accordéon Conformité → mettre un critère (RGAA) sur « Présent ».
- **Résultat attendu** : l'URL porte `compliancePresent__in` contenant le critère.

### CSF-06 — Filtre Conformité « Absent » migre vers complianceAbsent\_\_in ✅

- **Datafeature** : aucune (propagation URL).
- **Action** : positionner un critère (RGAA) sur « Présent » puis sur « Absent ».
- **Résultat attendu** : le critère bascule dans `complianceAbsent__in` ; `compliancePresent__in`
  disparaît de l'URL.

### CSF-07 — Filtre Email acteur reflété dans actorEmail ✅

- **Datafeature** : aucune (propagation URL).
- **Action** : accordéon Organisation & Acteurs → saisir un email d'acteur.
- **Résultat attendu** : l'URL porte `actorEmail` à la valeur saisie.

### CSF-08 — Filtre « Sans MOA » reflété dans missingMoa ✅

- **Datafeature** : aucune (propagation URL).
- **Action** : choisir « Sans Maîtrise d'Ouvrage (MOA) » dans le filtre type d'acteur.
- **Résultat attendu** : l'URL porte `missingMoa=true`.

### CSF-09 — Filtre « Sans MOE » exclut « Sans MOA » ✅

- **Datafeature** : aucune (propagation URL).
- **Action** : choisir « Sans MOA » puis « Sans MOE » (mutuellement exclusifs).
- **Résultat attendu** : l'URL porte `missingMoe=true` et `missingMoa` disparaît.

### CSF-10 — Filtre Source de données reflété dans dataSourceName ✅

- **Datafeature** : aucune (propagation URL).
- **Action** : accordéon Données → saisir un nom de source de données.
- **Résultat attendu** : l'URL porte `dataSourceName` à la valeur saisie.

### CSF-11 — Filtre Lien externe reflété dans link ✅

- **Datafeature** : aucune (propagation URL).
- **Action** : accordéon Général → saisir un lien externe.
- **Résultat attendu** : l'URL porte `link` à la valeur saisie.

### CSF-12 — La sidebar des filtres se replie puis se ré-affiche ✅

- **Datafeature** : aucune.
- **Action** : cliquer le bouton de bascule de la sidebar deux fois.
- **Résultat attendu** : la sidebar se masque puis réapparaît (état inversé puis rétabli).

### CSF-13 — Plusieurs filtres résiduels coexistent dans l'URL ✅

- **Datafeature** : aucune (propagation URL).
- **Action** : appliquer une borne Qualité, « Sans hébergement » et une source de données.
- **Résultat attendu** : l'URL porte simultanément `iqGte`, `iqLte`, `missingHosting` et
  `dataSourceName`.

### CSF-14 — Filtre Type d'acteur reflété dans actorType ✅

- **Datafeature** : ≥ 1 type d'acteur (lu dans les options du select).
- **Action** : accordéon Organisation & Acteurs → choisir un type d'acteur réel.
- **Résultat attendu** : l'URL porte `actorType`. (Cas `skipped` si aucun type d'acteur.)

### CSF-15 — Filtre Hébergement par fournisseur reflété dans hostingProvider ✅

- **Datafeature** : ≥ 1 option de fournisseur d'hébergement (lue dans le select).
- **Action** : accordéon Hébergement → choisir un fournisseur.
- **Résultat attendu** : l'URL porte `hostingProvider` à la valeur choisie. (Cas `skipped` si aucune
  option.)

### CSF-16 — Filtre Tag reflété dans tag ✅

- **Datafeature** : ≥ 1 tag (résolu via l'API).
- **Action** : accordéon Général → saisir un tag dans l'autocomplétion et sélectionner la suggestion.
- **Résultat attendu** : l'URL porte `tag`. (Cas `skipped` si aucun tag.)

### CSF-17 — Filtre Direction de métier reflété dans businessDivisionId ✅

- **Datafeature** : ≥ 1 direction de métier (résolue via l'API).
- **Action** : accordéon Organisation & Acteurs → saisir une direction de métier et sélectionner la
  suggestion.
- **Résultat attendu** : l'URL porte `businessDivisionId`. (Cas `skipped` si aucune direction.)

### CSF-18 — Filtre Relations : cible reflétée dans relationAppId ✅

- **Datafeature** : ≥ 1 application (cible de relation).
- **Action** : accordéon Relations → saisir une application et sélectionner la suggestion.
- **Résultat attendu** : l'URL porte `relationAppId`. (Cas `skipped` si aucune application.)
