# QA — Non-régression sur GitHub (remplace QASE)

Ce dossier porte le dispositif de **tests de non-régression** de RefApp. Il remplace QASE :
les cas de test vivent dans Git, les **campagnes** sont des **issues GitHub** (cases à cocher +
captures par étape), et une partie est **automatisée en Playwright** (POM + datafeature).

## Les 3 briques

| Brique                            | Où                                                           | Rôle                                                                          |
| :-------------------------------- | :----------------------------------------------------------- | :---------------------------------------------------------------------------- |
| **Protocoles** (source de vérité) | `qa/protocoles/*.md`                                         | Cas de test numérotés, versionnés, relus en PR                                |
| **Campagnes** (exécution)         | Issues créées depuis `.github/ISSUE_TEMPLATE/qa-*.md`        | Un testeur déroule, **coche** chaque étape, **joint une capture**             |
| **Automatisation**                | `e2e/{pom,fixtures,tests}` + `.github/workflows/qa-sync.yml` | Playwright rejoue les étapes automatisables et **coche les cases de l'issue** |

## L'identifiant d'étape : le pivot

Chaque étape porte un ID stable `XXX-NN` (`CAT-01`, `FIC-03`, `PRM-02`, `SIG-04`). Le **même ID** est :

- la case à cocher du protocole / de l'issue de campagne ;
- le **titre du test Playwright** correspondant (`test("CAT-01 - …")`).

C'est ce pivot qui permet à la CI (`qa-sync.yml`) de cocher automatiquement la bonne case selon le
résultat du test, et au testeur de savoir d'un coup d'œil ce qui est déjà couvert (colonne
**Automatisé** des protocoles).

| Préfixe | Domaine                                     | Protocole                                                                          |
| :------ | :------------------------------------------ | :--------------------------------------------------------------------------------- |
| `CAT-`  | Catalogue & recherche                       | [`protocoles/catalogue.md`](protocoles/catalogue.md)                               |
| `FIC-`  | Fiche application                           | [`protocoles/fiche-application.md`](protocoles/fiche-application.md)               |
| `PRM-`  | Permissions & rôles                         | [`protocoles/permissions.md`](protocoles/permissions.md)                           |
| `SIG-`  | Signalements & abonnements                  | [`protocoles/signalements-abonnements.md`](protocoles/signalements-abonnements.md) |
| `CMP-`  | Conformités (éco-conception & homologation) | [`protocoles/conformites.md`](protocoles/conformites.md)                           |
| `SCP-`  | Périmètres admin & groupes d'acteurs        | [`protocoles/scope-acteurs.md`](protocoles/scope-acteurs.md)                       |
| `MAI-`  | Intégration MAIA                            | [`protocoles/maia.md`](protocoles/maia.md)                                         |
| `QAL-`  | Qualité générale                            | [`protocoles/qualite-generale.md`](protocoles/qualite-generale.md)                 |
| `HIS-`  | Historique des modifications                | [`protocoles/historique.md`](protocoles/historique.md)                             |
| `CSF-`  | Catalogue — filtres avancés                 | [`protocoles/catalogue-filtres.md`](protocoles/catalogue-filtres.md)               |
| `ACC-`  | Accueil & chrome                            | [`protocoles/accueil.md`](protocoles/accueil.md)                                   |
| `TIM-`  | Diagramme Time                              | [`protocoles/time.md`](protocoles/time.md)                                         |
| `TRV-`  | Pages transverses                           | [`protocoles/transverse.md`](protocoles/transverse.md)                             |
| `DAT-`  | Détail d'une donnée                         | [`protocoles/data-application.md`](protocoles/data-application.md)                 |

## Cycle de vie d'une campagne (équivalent QASE « test run »)

1. **Ouvrir la campagne de version** : créer le milestone `QA vX.Y.Z`.
2. **Lancer chaque suite** : `Issues → New issue →` choisir le template `🧪 QA — <domaine>`.
   Renseigner l'en-tête (version, environnement, navigateur, testeur) et rattacher au milestone.
3. **Dérouler** : pour chaque étape, exécuter l'action, vérifier le résultat attendu, **cocher** la
   case et **glisser une capture** dans la zone `📎`.
4. **Échec** : ouvrir un bug (template `🐛 Rapport de bug`), le lier à l'issue de campagne, laisser la
   case décochée.
5. **Clôture** : compléter le tableau récapitulatif, poser le label de verdict `qa:pass` ou
   `qa:fail`, fermer l'issue.

### Labels

`qa` · `non-regression` · `qa:catalogue` · `qa:fiche` · `qa:permissions` · `qa:signalements` ·
verdict `qa:pass` / `qa:fail`. Création en une fois :

```bash
gh label create qa --color 1D76DB --description "Test QA / non-régression"
gh label create non-regression --color 0E8A16
for d in catalogue fiche permissions signalements; do gh label create "qa:$d" --color C5DEF5; done
gh label create qa:pass --color 0E8A16; gh label create qa:fail --color B60205
```

## Automatisation (Playwright) — package `e2e/` à la racine

Les tests e2e vivent dans un **package autonome `e2e/`** (et non dans `frontend/`) car ils couvrent
tout le système (front + API + Keycloak). Le serveur de dev du frontend est démarré automatiquement
par Playwright (`webServer` → `../frontend`).

- **POM strict** : `e2e/pom/` — un Page Object par vue. Les `data-testid` sont **encapsulés dans les
  Page Objects** (`byTestId` est protégé) ; **aucune spec ne manipule de sélecteur**, uniquement des
  méthodes sémantiques.
- **Datafeature** : `e2e/fixtures/` — fixture `data` exécutée **avant chaque test**, qui **résout via
  l'API** (`/api/v2`) les données réelles dont le protocole a besoin (1ʳᵉ application, app avec
  relations, app dont l'utilisateur est acteur…). Pas de seed déterministe requis ; un test qui ne
  trouve pas sa donnée se **skip proprement**.
- **Specs** : `e2e/tests/<domaine>.spec.ts`, un `test()` par étape automatisable (titre = ID d'étape).

```bash
cd e2e
pnpm install             # 1ʳᵉ fois (le frontend doit aussi avoir ses deps installées)
pnpm test:e2e            # tous les specs (stack docker requise : back + Keycloak + Postgres)
pnpm test:e2e:json       # sortie JSON consommée par qa-sync (résultats par ID d'étape)
pnpm type-check          # tsc --noEmit (vérifie le typage du POM)
```

## Campagne automatique pilotée par release-please (`.github/workflows/qa-campaign.yml`)

Le cycle de campagne est **entièrement automatisé** autour de release-please :

1. **PR release-please ouverte** (version `vX.Y.Z` à venir) → `qa/scripts/campaign.mjs open` crée les
   4 issues `[QA][vX.Y.Z] <domaine>` (idempotent), la CI monte la stack, rejoue **toute** la
   non-régression, publie les screenshots (branche `qa-screenshots`) et `qa/scripts/sync-issue.mjs`
   **remplit chaque issue** (cases + captures par étape + verdict `qa:pass`/`qa:fail`).
2. **Gate** : si la non-régression échoue, le job **échoue** → à condition d'avoir ajouté ce check
   aux _required status checks_ de `main`, le **merge de la release est bloqué**.
3. **PR release-please mergée** (tag `vX.Y.Z`) → `qa/scripts/campaign.mjs close` **ferme** les 4
   issues de la version.

> Prérequis (réglage GitHub, hors code) : marquer le check « Campagne de non-régression » comme
> **required** sur la protection de branche `main` pour activer le blocage.

### Moteur de synchronisation (`qa/scripts/sync-issue.mjs`)

Lit le JSON Playwright, **coche les étapes passées**, embarque le screenshot de chaque étape, met à
jour le récapitulatif et pose le verdict. Les étapes non couvertes restent décochées : pas de faux
vert.

### Déclenchement manuel (`.github/workflows/qa-sync.yml`)

Conservé pour rejouer une campagne à la demande : `workflow_dispatch` avec `version` + `issue_number`
(utile hors cycle release).
