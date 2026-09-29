# ADR-009 — Structurer les modules backend par fonctionnalité

## Statut

Proposé

## Date

2026-09-28

## Participants

Contributeurs du ticket [#2293](https://github.com/dnum-mi/referentiel-applications/issues/2293) ; validation lors de la revue de la PR.

## Contexte et Problème

Le backend combine des modules plats (`saved-filter/`), des modules séparant application et infrastructure (`stats/`) et des structures hybrides (`relationship/`). Des vestiges rendent la navigation ambiguë : `product/` ne contient plus qu'un type de relation, `use-cases.ts/` porte une extension de fichier et le service de journalisation des requêtes est isolé dans `services/`.

## Options Considérées

- Imposer les mêmes couches à tous les modules : homogène, mais ajoute des répertoires et des interfaces sans responsabilité distincte dans les petits modules.
- Conserver chaque organisation sans convention : évite les déplacements, mais laisse apparaître de nouveaux dossiers transversaux sans propriétaire clair.
- Organiser par fonctionnalité avec une structure simple par défaut, puis extraire les couches utiles selon la complexité.

## Décision

Retenir la troisième option pour les nouveaux modules et les évolutions des modules existants.

- Chaque fonctionnalité possède un dossier en `kebab-case`, un module NestJS et ses contrôleurs, services, DTO et tests. Un petit module reste plat, avec un sous-dossier `dto/` si nécessaire.
- Extraire des cas d'usage dans `use-cases/` lorsqu'ils isolent une règle ou une orchestration testable. Réserver `domain/` aux règles et types indépendants du transport et de la persistance, et `infrastructure/` aux adaptateurs d'accès aux données ou aux services externes. Ne pas créer de couches vides ni de repository qui ne fait que recopier un service.
- Un module déjà structuré en `application/`, `domain/`, `infrastructure/` ou `interfaces/` peut conserver cette organisation. Toute nouvelle couche doit avoir une responsabilité distincte ; la convergence se fait lors d'une évolution utile, sans réorganisation générale.
- Placer les DTO et types auprès de la fonctionnalité qu'ils décrivent. Les dépendances entre fonctionnalités passent par des services exportés par leur module ou par des contrats explicites ; éviter les dossiers génériques tels que `product/` ou `services/` sans périmètre métier.
- Regrouper les fonctions transversales dans un module nommé pour leur rôle (`logger/`, `prisma/`, `config/`, `common/`). Déclarer une dépendance une seule fois dans le tableau `imports` d'un même module.
- Colocaliser les tests avec le code concerné. Un répertoire ne porte pas d'extension de fichier.

Le nettoyage associé déplace `RelationTypeFilter` dans le dossier DTO existant de `relationship/`, renomme `token/use-cases.ts/` en `token/use-cases/` et regroupe `LoggingService` avec `LoggerService` dans `logger/`. Les deux services conservent leurs rôles distincts (contexte de requête et écriture des logs) et leur injection existante. Aucun contrat HTTP ne change.

## Conséquences

Les nouveaux fichiers ont un emplacement prévisible, tout en évitant d'imposer une architecture à plusieurs couches aux fonctionnalités simples. Plusieurs structures historiques subsistent ; leur migration n'est pas un prérequis à chaque correction.

## Liens et Références

- [Ticket #2293](https://github.com/dnum-mi/referentiel-applications/issues/2293)
- [ADR-003 — Architecture monorepo NestJS + Vue 3](./0003-monorepo-nestjs-vue.md)
- [Module simple : saved-filter](../../backend/src/saved-filter/)
- [Module avec couches : stats](../../backend/src/stats/)
