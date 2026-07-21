# ADR-008 — Feature flipping : table Prisma, gating déclaratif et propagation temps réel

## Statut

Accepté

## Date

2026-07-21

## Participants

Équipe RefApp — DNUM-MI

## Contexte et Problème

(Context and Problem Statement)

Jusqu'ici, la configuration dynamique de RefApp passait uniquement par des **variables d'environnement** lues au démarrage (`FOOTER_LINKS`, `SMTP_ENABLED`…) : activer ou couper une fonctionnalité (recherche full-text du ticket 1753, impersonation, onglets métier…) exigeait un **redéploiement**. Le ticket #2029 demande un mécanisme de **feature flipping** : bascule **à chaud**, sans redéploiement, avec des **défauts par environnement**, pilotée depuis l'écran d'administration.

La décision couvre : où vit la source de vérité, comment le code décide qu'une fonctionnalité est active (sans disséminer des conditions dans tout le code), comment une bascule se propage (instances backend multiples, navigateurs déjà ouverts), et qui a le droit de basculer.

## Options Considérées

(Decision Drivers)

- Bascule effective sans redéploiement ni redémarrage, en secondes.
- Aucune infrastructure supplémentaire (contrainte d'exploitation RIE/MI).
- Un flag ajouté au code doit exister dans **tous** les environnements, y compris la production où le seed ne tourne jamais.
- Le gating ne doit pas se traduire par des conditions `if` disséminées (maintenabilité, testabilité).
- Effet global de la bascule → gouvernance stricte (admin global) et trace attribuable.

### Option 1 — Variables d'environnement (statu quo)

Avantages :

- aucun code nouveau, mécanisme déjà en place ;
- état versionné avec le déploiement.

Inconvénients :

- toute bascule exige un redéploiement (précisément le problème posé) ;
- pas de bascule par un administrateur métier, pas d'audit applicatif.

### Option 2 — Service de feature flags dédié (Unleash, Flagsmith, GrowthBook…)

Avantages :

- fonctionnalités riches (ciblage par utilisateur, pourcentage de déploiement, A/B) ;
- écosystème et SDK existants.

Inconvénients :

- une brique d'infrastructure supplémentaire à héberger, sécuriser et exploiter sur le RIE ;
- intégration à refaire avec le modèle de permissions à trois couches (ADR-007) ;
- surdimensionné : le besoin est un interrupteur global par fonctionnalité, pas du ciblage individuel.

### Option 3 — Table Prisma + mécanisme applicatif maison (retenue)

Avantages :

- Postgres est déjà le point commun de toutes les instances : source de vérité (`FeatureFlag`), **propagation LISTEN/NOTIFY** sans infrastructure nouvelle ;
- intégration native aux gardes NestJS et permissions existantes ;
- catalogue **dans le code** (`feature-flag.keys.ts`), typé et revu comme le reste.

Inconvénients :

- fonctionnalités volontairement limitées (pas de ciblage par utilisateur ni de déploiement progressif) ;
- mécanique de cache/propagation à assumer nous-mêmes (TTL, invalidation, résilience).

## Décision

Nous retenons l'**option 3**, avec les choix structurants suivants :

1. **Source de vérité** : table `FeatureFlag` (clé technique stable, libellé, description, état, audit `updatedById`/`updatedAt`).
2. **Catalogue en code, synchronisé au boot** (`syncFeatureFlagCatalog`, partagée avec le seed) : création des flags manquants (état initial `defaultEnabled` — activé pour l'existant en production, désactivé pour l'expérimental), réalignement des libellés, **suppression des orphelins** (un flag retiré du code disparaît de l'admin), pré-activation par environnement via `FEATURE_FLAGS_DEFAULTS` (sens unique, n'écrase jamais un choix d'admin). C'est ce qui garantit qu'un flag existe partout, la production n'exécutant que `migrate deploy`.
3. **Gating déclaratif, jamais conditionnel en place** : côté backend, décorateur `@FeatureFlag(clé)` (classe ou méthode) + `FeatureFlagGuard` répondant **404** (ne pas divulguer une fonctionnalité coupée) ; côté frontend, primitives `featureKey` (onglets), `meta.requiresFeature` (routes, typée), `v-feature` (directive réactive), `useFeatureFlag` et `allows()` (listes filtrées). Une règle ESLint (`no-restricted-syntax`) **interdit tout appel direct `isEnabled()` hors primitives** : ajouter une exception est une décision de revue, pas une dérive silencieuse.
4. **Lecture et propagation** : cache mémoire par instance (TTL court, stale-while-error en panne de base, rechargements versionnés) ; une bascule invalide l'instance locale et **notifie les autres via Postgres LISTEN/NOTIFY** — le TTL n'est qu'un filet de sécurité. `GET /config` (public) n'expose que les flags **activés** (une clé absente vaut « désactivé »). Les navigateurs ouverts suivent par **polling** (60 s) avec réactivité complète (navigation, onglets, éjection d'une route dont le flag est coupé).
5. **Gouvernance** : `GET`/`PATCH /feature-flags` réservés aux **administrateurs globaux** (`UnscopedAdminGuard` : 403 pour un compte restreint à un périmètre, l'effet d'un flag étant global) ; bascule imputée à l'admin réel même sous impersonation, journalisée en niveau info.
6. **Hors périmètre du flipping** : la déclaration d'accessibilité (mention légale RGAA) n'est volontairement **pas flaggable**.

## Conséquences

Positives :

- bascule à chaud effective en secondes sur toutes les instances et, en moins d'une minute, dans les sessions déjà ouvertes ;
- ajouter un flag = une entrée dans le catalogue, rien d'autre (sync au boot) ;
- kill-switches réels : un domaine coupé répond 404 côté API et disparaît de l'interface ;
- doctrine anti-dispersion outillée (lint en CI) et catalogue protégé contre la dérive (tests e2e front/back).

Négatives (assumées) :

- le miroir front des clés (`frontend/src/constants/feature-flags.ts`) est un doublon contrôlé, gardé par un test e2e ;
- pas d'historique des bascules (seul le dernier auteur est conservé) — un journal calqué sur `UserPermissionLog` est identifié comme suivi ;
- pas de ciblage par utilisateur ni de déploiement progressif : si ce besoin émerge, un nouvel ADR devra réévaluer l'option service dédié ;
- l'état global des flags impose une discipline e2e particulière (suite Playwright isolée dans un projet dédié exécuté après les navigateurs, restauration par le teardown de la fixture).

## Liens et Références

- Ticket [#2029](https://github.com/dnum-mi/referentiel-applications/issues/2029) — demande initiale ; PR [#2081](https://github.com/dnum-mi/referentiel-applications/pull/2081) — implémentation.
- `backend/src/feature-flag/` (module, garde, sync, pub/sub), `frontend/src/stores/featureFlagStore.ts` et primitives associées.
- [ADR-004](./0004-migrations-prisma-sql-manuel.md) (migrations Prisma), [ADR-007](./0007-permissions-trois-couches-secrets.md) (modèle de permissions, dont `AdminPanelManage`).
- Documentation : `docs/05-api.md` (endpoints), `docs/12-exploitation-deploiement.md` (variables d'exploitation), `qa/protocoles/feature-flags.md` (protocole de non-régression FLG).
