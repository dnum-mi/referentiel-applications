# Accessibilité (RGAA)

Le Référentiel des applications (RefApp) est un service public numérique. À ce titre, il
est soumis à l'obligation légale d'accessibilité et vise la conformité au **RGAA**
(Référentiel Général d'Amélioration de l'Accessibilité). Cette page décrit le cadre
réglementaire, le dispositif de suivi de l'accessibilité dans le produit et la démarche
de contrôle continu mise en place.

## Sommaire

- [1. Cadre et engagement](#1-cadre-et-engagement)
- [2. Suivi RGAA dans le produit](#2-suivi-rgaa-dans-le-produit)
- [3. Démarche en continu](#3-démarche-en-continu)
- [4. Déclaration d'accessibilité et voies de recours](#4-déclaration-daccessibilité-et-voies-de-recours)

## 1. Cadre et engagement

L'accessibilité numérique est une obligation pour les services publics, fondée sur
l'**article 47 de la loi n° 2005-102 du 11 février 2005** pour l'égalité des droits et des
chances des personnes handicapées. Elle impose la mise en conformité avec le **RGAA**
(version de référence : RGAA 4.1.2).

RefApp s'appuie sur le **Système de Design de l'État (DSFR)**, dont les composants sont
conçus pour être accessibles par défaut (sémantique HTML, contrastes, navigation
clavier). Le DSFR constitue un socle favorable, mais il ne garantit pas à lui seul la
conformité : les assemblages de composants, les écrans complexes (onglets, modales,
graphiques interactifs) et les contenus saisis doivent être vérifiés et corrigés au cas
par cas.

La conception et l'architecture frontend (Vue 3 + DSFR) sont décrites dans la
documentation [architecture frontend](./09-architecture-frontend.md).

## 2. Suivi RGAA dans le produit

Au-delà de sa propre conformité, RefApp permet de **documenter la conformité RGAA des
applications référencées**. Le modèle Prisma
[`RgaaCompliance`](../backend/prisma/schema/rgaa-compliance.prisma) enregistre, pour
chaque URL de service d'une application, les informations d'accessibilité :

| Champ               | Description                                         |
| ------------------- | --------------------------------------------------- |
| `service_url`       | URL du service audité                               |
| `audit_date`        | Date de l'audit d'accessibilité                     |
| `score_percentage`  | Score de conformité en pourcentage (0–100)          |
| `accessibility_url` | Lien vers la déclaration d'accessibilité du service |

Une application peut porter **0 à N conformités RGAA, une par URL de service** (contrainte
d'unicité sur `applicationId` + `service_url`). Ces données sont présentées et éditées via
l'onglet RGAA de la fiche application, décrit dans la documentation
[fonctionnalités](./07-fonctionnalites.md).

Le site expose par ailleurs une **page d'accessibilité publique**
(`frontend/src/views/AccessibilityPage.vue`, route `/accessibilite`), accessible depuis le
pied de page conformément à l'obligation d'afficher la mention de conformité sur toutes
les pages.

## 3. Démarche en continu

L'accessibilité est intégrée à la chaîne de développement, pour éviter les régressions et
tendre progressivement vers la conformité totale :

- **Tests automatisés axe-core** — les tests end-to-end (Playwright, via
  `@axe-core/playwright`) exécutent des analyses d'accessibilité sur les écrans. Le scan
  cible les zones identifiées par `data-testid` et signale notamment les violations
  d'impact critique (voir `frontend/tests/qualityPage.spec.ts`). La démarche de tests et
  de contribution est détaillée dans le [guide de contribution](./11-contribution.md).
- **Composants DSFR** — privilégier systématiquement les composants du Système de Design
  de l'État, accessibles par défaut.
- **Bonnes pratiques** — respect des contrastes, navigation et focus au clavier,
  hiérarchie de titres cohérente, restitution des statuts via `aria-live`, et usage des
  attributs `data-testid` pour fiabiliser les tests.

> Les outils automatisés ne couvrent qu'une partie des critères RGAA. Ils complètent, sans
> les remplacer, les vérifications manuelles et les audits réalisés avec lecteur d'écran
> prévus par le RGAA.

## 4. Déclaration d'accessibilité et voies de recours

Conformément au RGAA, RefApp publie une **déclaration d'accessibilité** au format
obligatoire sur sa page d'accessibilité, dans un format accessible. Elle précise le statut
de conformité, les éventuels contenus non accessibles, les technologies et l'environnement
de test ainsi que les voies de recours.

Si une demande adressée au responsable du site reste sans réponse satisfaisante, l'usager
peut saisir le **Défenseur des droits** :

- Formulaire en ligne : <https://formulaire.defenseurdesdroits.fr/>
- Délégué du Défenseur des droits en région : <https://www.defenseurdesdroits.fr/saisir/delegues>
- Par courrier (gratuit, sans timbre) : Défenseur des droits — Libre réponse 71120 — 75342 Paris CEDEX 07
