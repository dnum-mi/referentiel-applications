# ADR-002 — Utiliser Apache Superset pour la datavisualisation du référentiel des applications

## Statut

Accepted

## Date

2026-02-01

## Participants

Mathieu Pichon (DTNUM/SDID)
Hassan DRISS (DTNUM/SDID)

## Contexte et Problème
(Context and Problem Statement)

Le référentiel des applications vise à constituer un point de vérité unique pour recenser et gérer les métadonnées des applications.

Des développements spécifiques ont été réalisés dans l’application pour répondre aux premiers besoins de datavisualisation, notamment :

* la représentation de la volumétrie du nombre d’applications ;
* le calcul et le suivi de la complétude des données ;
* la restitution d’indicateurs simples directement dans l’interface du référentiel.

Ces développements étaient suffisants tant que les besoins de pilotage restaient limités, stables et fortement liés aux écrans applicatifs existants.

Ce suivi ne suffit plus. Les besoins évoluent vers une capacité d’analyse plus autonome, plus itérative et moins dépendante du cycle de développement applicatif. Le maintien d’une solution de datavisualisation custom dans le code du référentiel crée un couplage entre :

* la gestion des données de référence ;
* la production d’indicateurs ;
* l’évolution des tableaux de bord ;
* les demandes métiers d’exploration ou de croisement de données.

La décision à prendre est donc de déterminer si les fonctions de datavisualisation doivent continuer à être développées spécifiquement dans le référentiel ou être portées par une solution dédiée.

## Options Considérées
(Decision Drivers)

* Réduire le couplage entre le référentiel applicatif et les besoins de pilotage.
* Permettre l’évolution des indicateurs sans développement spécifique systématique.
* Faciliter la création de nouveaux tableaux de bord par des profils non développeurs ou data analysts.
* Capitaliser sur une solution open source éprouvée.
* Conserver le référentiel comme source de vérité, sans en faire un outil de BI complet.
* Limiter la dette technique liée aux composants graphiques, agrégations, filtres, exports et droits d’accès analytiques.
* Améliorer la maintenabilité du produit.
* Préserver la capacité à exposer des indicateurs de complétude, de qualité, de volumétrie et de pilotage.

### Option 1 — Continuer le développement custom dans le référentiel

Cette option consiste à enrichir le code existant du référentiel avec de nouveaux écrans, graphiques, filtres, agrégations, exports et indicateurs.

Avantages :

* intégration complète dans l’application ;
* maîtrise totale du rendu et de l’expérience utilisateur ;
* pas de composant supplémentaire à déployer ;
* cohérence immédiate avec le modèle applicatif existant.

Inconvénients :

* augmentation de la dette technique ;
* forte dépendance au cycle de développement applicatif ;
* difficulté à répondre rapidement à des besoins exploratoires ;
* nécessité de maintenir des composants de datavisualisation qui ne relèvent pas du cœur fonctionnel du référentiel ;
* risque de transformer progressivement le référentiel en outil décisionnel spécifique ;
* coût récurrent pour chaque nouveau graphique, filtre, indicateur ou export.

### Option 2 — Utiliser Apache Superset comme solution de datavisualisation dédiée

Cette option consiste à utiliser Superset pour construire les tableaux de bord, indicateurs et analyses à partir des données du référentiel, tout en conservant le référentiel comme système maître.

Avantages :

* séparation claire entre le produit référentiel et la couche décisionnelle ;
* création et évolution de dashboards sans développement applicatif systématique ;
* fonctionnalités natives de datavisualisation, filtres, exploration, dashboards et SQL ;
* meilleure autonomie des utilisateurs habilités pour l’analyse ;
* réduction de la dette technique dans le code du référentiel ;
* capacité à traiter des cas d’usage de pilotage plus riches que les indicateurs actuels ;
* possibilité d’industrialiser la publication d’indicateurs de complétude, qualité, volumétrie et suivi;
* compatible kubernetes et dsfr;
* solution connue et mise en oeuvre dans selfim, siaf etc;
* solution inscrite au [SILL](https://code.gouv.fr/sill/);
* solution open source alignée avec le contexte du référentiel

Inconvénients :

* composant supplémentaire à déployer, sécuriser et superviser ;
* nécessité de définir les modalités d’accès aux données ;
* besoin de gouvernance sur les datasets, dashboards et droits ;
* risque de duplication ou de mauvaise interprétation des indicateurs si les définitions ne sont pas maîtrisées ;
* dépendance opérationnelle à une plateforme de datavisualisation distincte.

### Option 3 — Utiliser une autre solution BI ou dataviz

Cette option consiste à retenir une autre solution de business intelligence ou de datavisualisation.

Avantages :

* possibilité de comparer plusieurs produits selon des critères fonctionnels, techniques ou organisationnels ;
* éventuelle compatibilité avec des solutions déjà en place.

Inconvénients :

* analyse comparative plus longue ;
* risque de dépendance à une solution propriétaire selon l’outil retenu ;
* intégration potentiellement moins cohérente avec une démarche open source ;
* besoin de justification supplémentaire si une alternative non open source est choisie.

## Décision
(Decision Outcome)

Nous retenons l’utilisation d’Apache Superset comme solution de datavisualisation dédiée pour le référentiel des applications.

Le référentiel reste le système de référence pour la gestion des applications et de leurs métadonnées. Superset devient la couche dédiée à l’exploration, à la visualisation et au pilotage des données issues du référentiel.

Les développements custom existants peuvent être conservés lorsqu’ils répondent à un besoin simple, stable et directement intégré au parcours applicatif. En revanche, les nouveaux besoins de pilotage, d’analyse, de suivi de complétude ou de tableaux de bord évolutifs doivent être prioritairement traités dans Superset.

## Conséquences

 - Avantages

* Le code du référentiel reste centré sur son cœur de mission : collecter, structurer, exposer et maintenir les métadonnées applicatives.
* Les tableaux de bord peuvent évoluer plus rapidement, sans nécessiter un développement applicatif pour chaque modification.
* Les utilisateurs habilités peuvent explorer les données de manière plus autonome.
* Les indicateurs de complétude et de volumétrie peuvent être enrichis par des analyses plus avancées.
* La maintenabilité globale est améliorée par la séparation des responsabilités.
* La solution reste cohérente avec une démarche open source.
* La dette technique liée aux composants graphiques spécifiques est limitée.
* Les besoins futurs de pilotage peuvent être absorbés par une plateforme conçue pour cet usage.

- Inconvénients

* Une plateforme supplémentaire doit être exploitée.
* Les règles de sécurité, d’authentification, d’autorisation et de traçabilité doivent être définies.
* Les modèles de données exposés à Superset doivent être documentés et stabilisés.
* Les définitions d’indicateurs doivent être gouvernées pour éviter les divergences entre dashboards.
* Une compétence minimale Superset doit être acquise par l’équipe produit, data ou exploitation.

## Implémentation

La mise en œuvre devra préciser :

* le mode d’accès de Superset aux données du référentiel ;
* les vues, tables ou datasets exposés à la datavisualisation ;
* les règles de filtrage et d’habilitation ;
* les indicateurs de référence : volumétrie, complétude, qualité des données, obsolescence, criticité, rattachements organisationnels ;
* la stratégie de déploiement et de supervision de Superset ;
* les responsabilités entre l’équipe référentiel, l’équipe data et les administrateurs Superset ;
* les conventions de nommage des datasets, graphiques et dashboards ;
* le processus de validation des indicateurs partagés.

- Critère de validation

La décision sera considérée comme validée si :

* les indicateurs existants de volumétrie et de complétude sont reproduits dans Superset ;
* au moins un dashboard de pilotage est disponible hors développement applicatif spécifique ;
* les données sources restent maîtrisées par le référentiel ;
* les droits d’accès aux dashboards sont définis ;
* les définitions des indicateurs principaux sont documentées ;
* l’ajout ou l’évolution d’un indicateur simple ne nécessite plus une modification du code du référentiel.

## Liens

* Référentiel des applications : https://github.com/dnum-mi/referentiel-applications
* Apache Superset : https://superset.apache.org/
