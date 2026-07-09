# ADR-007 — Modèle de permissions à trois couches et secrets hors du code

## Statut

Accepté

## Date

2026-06-09

## Participants

Équipe RefApp — DNUM-MI

## Contexte et Problème

(Context and Problem Statement)

RefApp doit gérer des droits fins : tous les utilisateurs n'ont pas les mêmes capacités, et certains droits dépendent du **statut d'acteur** d'un utilisateur **sur une application donnée** (MOE, MOA, etc.).

Un simple système de rôles globaux s'avère insuffisant pour couvrir ce besoin, puisqu'il ne permet pas d'accorder des droits variables selon l'application et le statut d'acteur de l'utilisateur.

En parallèle, le code ne doit contenir **aucun secret en dur** : une règle stricte de gestion des secrets s'applique (Vault et/ou SOPS).

La décision à prendre est donc de déterminer comment modéliser les autorisations pour couvrir ces droits fins liés au métier, et comment garantir qu'aucun secret n'est stocké dans le dépôt.

## Options Considérées

(Decision Drivers)

- Offrir une granularité de droits fine, dépendante du statut d'acteur d'un utilisateur sur une application donnée.
- Aligner les autorisations sur le métier (acteurs par application) plutôt que sur des rôles purement globaux.
- Interdire tout secret en dur dans le code et réduire la surface d'exposition des secrets.
- Conserver une logique d'autorisation dont la complexité reste maîtrisable en test et en exploitation.

### Option 1 — Rôles globaux et secrets dans le dépôt (statu quo)

Cette option consiste à conserver un système de rôles globaux et à laisser les secrets (tokens, identifiants) dans le code ou la configuration du dépôt.

Avantages :

- logique d'autorisation simple à raisonner et à tester ;
- absence de dépendance à une chaîne de gestion de secrets externe (Vault/SOPS).

Inconvénients :

- insuffisant pour les droits fins qui dépendent du statut d'acteur d'un utilisateur sur une application donnée ;
- désalignement avec le métier (impossible de refléter les acteurs par application) ;
- secrets en dur dans le dépôt, avec une surface d'exposition élevée.

### Option 2 — Modèle d'autorisation à trois couches cumulatives et secrets hors du code

Cette option consiste à calculer les droits effectifs comme l'union de trois sources (rôle, permissions individuelles, permissions héritées du type d'acteur sur l'application) avec une sémantique OU, et à externaliser tous les secrets via Vault et/ou SOPS.

Avantages :

- granularité fine des droits, alignée sur le métier (acteurs par application) ;
- prise en compte du statut d'acteur d'un utilisateur sur une application donnée ;
- surface d'exposition des secrets réduite, aucun secret en dur dans le dépôt.

Inconvénients :

- logique d'autorisation plus complexe à raisonner et à tester (union de trois sources) ;
- chaîne de secrets (Vault/SOPS) qui demande de la rigueur en exploitation.

## Décision

(Decision Outcome)

- Mettre en place un **modèle d'autorisation à trois couches cumulatives**, où les droits effectifs d'un utilisateur sont l'**union** :
  1. des permissions de son **rôle** ;
  2. de ses **permissions individuelles** ;
  3. des permissions héritées de son **type d'acteur** sur l'application concernée.
- Appliquer une **sémantique OU** : posséder l'**une** des permissions requises suffit à accorder l'accès.
- **Sortir tous les secrets du code** : gestion des secrets via **Vault et/ou SOPS** ; aucun token ni secret en dur dans le dépôt.

## Conséquences

- Avantages

* Granularité fine des droits, alignée sur le métier (acteurs par application).
* Surface d'exposition des secrets réduite.

- Inconvénients

* La logique d'autorisation est plus complexe à raisonner et à tester (union de trois sources).
* La chaîne de secrets (Vault/SOPS) demande de la rigueur en exploitation.
* Règle de sécurité connexe à respecter : **ne pas exposer la liste ni les types d'hébergement** de l'organisation dans le code/issues (pas d'enum).

## Liens et Références

- [Permissions et sécurité](../../docs/06-permissions-et-securite.md)
- Référentiel des applications : https://github.com/dnum-mi/referentiel-applications
