# ADR-004 — Migrations Prisma maîtrisées et SQL manuel pour les cas non couverts

## Statut

Accepté

## Date

2026-06-09

## Participants

Équipe RefApp — DNUM-MI

## Contexte et Problème

La base de données du référentiel est une **PostgreSQL** opérée via **Prisma ORM**.

Pousser le schéma avec `prisma db push` n'est pas iso-production et reste risqué en environnement réel.

Prisma présente par ailleurs des **limites assumées comme dette** :

- pas de **migration de données** native ;
- pas de gestion des **contraintes `CHECK`** ni des **vues SQL** dans le schéma-as-code.

Ces limites ont, par le passé, provoqué des incidents de migration : recast de clés primaires sur tables non vides, suppression de table bloquée par des vues dépendantes, écarts entre l'état réel de la base et l'historique des migrations.

La décision à prendre est donc de déterminer comment fiabiliser les migrations en environnement réel tout en couvrant les cas que Prisma ne sait pas exprimer.

## Options Considérées

Critères de décision :

- obtenir des déploiements reproductibles et iso-production ;
- disposer d'un historique de migrations versionné ;
- pouvoir exprimer ce que Prisma ne couvre pas (contraintes `CHECK`, vues SQL, migrations de données, recasts de types ou de clés) ;
- éviter les incidents de migration liés aux écarts entre l'état réel de la base et l'historique des migrations.

### Option 1 — Pousser le schéma avec `prisma db push`

Cette option consiste à synchroniser directement le schéma applicatif vers la base sans historique de migrations dédié.

Avantages :

- mise en œuvre immédiate à partir du schéma Prisma ;
- pas de fichiers de migration à maintenir.

Inconvénients :

- approche **non iso-production** et **risquée** en environnement réel ;
- absence d'historique de migrations versionné ;
- ne couvre ni les contraintes `CHECK`, ni les vues SQL, ni les migrations de données.

### Option 2 — `prisma migrate deploy` en s'appuyant uniquement sur le schéma-as-code

Cette option consiste à jouer des migrations reproductibles générées par Prisma, sans recourir à du SQL manuel.

Avantages :

- déploiements reproductibles et iso-production ;
- historique de migrations versionné ;
- structure décrite entièrement dans le schéma-as-code.

Inconvénients :

- les **limites de Prisma** restent non traitées : contraintes `CHECK`, **vues SQL** d'export, **migrations de données**, recasts de types ou de clés étrangères ne peuvent pas être exprimés ;
- les incidents déjà rencontrés (recasts sur tables non vides, vues dépendantes bloquant une suppression) ne sont pas couverts.

### Option 3 — `prisma migrate deploy` complété par des migrations SQL manuelles

Cette option consiste à jouer des migrations Prisma reproductibles et à écrire des migrations SQL manuelles dédiées pour tout ce que Prisma ne sait pas exprimer.

Avantages :

- déploiements reproductibles et iso-production, migration jouée automatiquement au démarrage ;
- historique de migrations versionné ;
- couverture des cas non gérés par Prisma (contraintes `CHECK`, vues SQL, migrations de données, recasts de types ou de clés) ;
- possibilité de vérifier les vues dépendantes avant toute modification de table.

Inconvénients :

- une partie de la structure réelle (`CHECK`, vues, transformations de données) n'est pas visible dans le schéma-as-code ;
- relecture plus difficile et risque accru d'écarts de schéma.

## Décision

- Utiliser **`prisma migrate deploy`** (plutôt que `prisma db push`) pour des déploiements reproductibles, la migration étant jouée automatiquement au démarrage.
- Pour tout ce que Prisma ne sait pas exprimer (contraintes `CHECK`, **vues SQL** d'export, **migrations de données**, recasts de types ou de clés étrangères), écrire des **migrations SQL manuelles** dédiées.
- Vérifier les **vues SQL dépendantes** avant de supprimer ou modifier une table.

## Conséquences

- Avantages

- Les déploiements sont **iso-production et reproductibles**.
- L'historique de migrations est **versionné**.

- Inconvénients

- Une partie de la structure réelle (`CHECK`, vues, transformations de données) **n'est pas visible** dans le schéma-as-code, ce qui complique la relecture et favorise les écarts de schéma.
- Les **modifications manuelles en production** sont à proscrire : elles peuvent faire échouer les migrations ultérieures.

## Liens et Références

- [Modèle de données](../../docs/04-modele-de-donnees.md)
- Référentiel des applications : https://github.com/dnum-mi/referentiel-applications
