# Présentation

Le **Référentiel des Applications** (RefApp) est le point de vérité unique destiné à cataloguer et gérer les métadonnées des applications du **ministère de l'Intérieur**. Porté par la **DNUM-MI** (Direction du Numérique du ministère de l'Intérieur), il succède au service historique « CANEL », en cours de décommissionnement.

Cette page présente la finalité du produit, ses utilisateurs cibles, son périmètre fonctionnel en bref, son positionnement de plateforme d'intégration ainsi qu'un glossaire des acronymes du domaine.

## Sommaire

- [À quoi sert RefApp](#à-quoi-sert-refapp)
- [À qui s'adresse RefApp](#à-qui-sadresse-refapp)
- [Périmètre fonctionnel en bref](#périmètre-fonctionnel-en-bref)
- [Positionnement : une plateforme d'intégration](#positionnement--une-plateforme-dintégration)
- [Glossaire](#glossaire)

## À quoi sert RefApp

RefApp est un catalogue centralisé qui répertorie les applications numériques du ministère de l'Intérieur et en consolide les métadonnées. L'objectif est de fournir aux équipes techniques, métier et sécurité un **point de vérité unique** sur l'état et la gouvernance de chaque application.

Pour chaque application, le référentiel permet de documenter notamment :

- le **statut** dans le cycle de vie (de la construction au décommissionnement) ;
- les **acteurs** et responsabilités (maîtrise d'ouvrage, maîtrise d'œuvre, exploitation, sécurité…) ;
- la **conformité** réglementaire et technique sur plusieurs axes (continuité, sécurité, protection des données, design, accessibilité, sobriété numérique) ;
- l'**hébergement** (de manière générique) ;
- les **données exposées** ou consommées par l'application ;
- la **dette technique** et la maturité de l'application.

Un **indice de qualité (IQ)** mesure automatiquement la complétude de chaque fiche, ce qui permet de piloter l'effort de documentation à l'échelle du référentiel.

L'organisation porteuse est la **DNUM-MI**. RefApp constitue la réécriture du service historique **CANEL**.

## À qui s'adresse RefApp

RefApp s'adresse à l'ensemble des profils impliqués dans la vie des applications du ministère, avec des niveaux d'accès différenciés :

- **Agents du ministère de l'Intérieur** souhaitant consulter le catalogue et l'état des applications ;
- **Acteurs MOA / MOE** (maîtrise d'ouvrage et d'œuvre) responsables de la conception et de la réalisation ;
- **RSSI et acteurs de la sécurité** suivant l'homologation, la protection des données et la conformité SSI ;
- **Exploitants et équipes d'exploitation** documentant l'hébergement, le cycle de vie et la continuité de service ;
- **Décideurs et responsables de programmes** disposant d'une vue de pilotage (qualité, dette technique, tendances).

Le détail des rôles et des droits associés est décrit dans la page [Permissions et sécurité](./06-permissions-et-securite.md).

## Périmètre fonctionnel en bref

À haut niveau, RefApp couvre :

- la **recherche et la consultation** du catalogue d'applications (filtres multiples, vues liste ou cartes, IQ moyen en temps réel) ;
- la **fiche application** détaillée (informations générales, acteurs, cycle de vie et statuts, hébergement, conformités, relations entre applications, liens externes, sources de données) ;
- l'**indice de qualité (IQ)** calculé automatiquement ;
- les **signalements** (par application ou globaux) et les **abonnements** avec notifications par e-mail ;
- l'**historique** des modifications (audit transverse) ;
- les **tableaux de bord** de qualité et de dette technique ;
- l'**export** des données et l'**administration** (utilisateurs, rôles, matrice de permissions, tags et sources).

Le détail de chacune de ces fonctionnalités est présenté dans la page [Fonctionnalités](./07-fonctionnalites.md).

## Positionnement : une plateforme d'intégration

RefApp ne se limite pas à un catalogue alimenté manuellement. Sa cible est de devenir une **plateforme d'intégration** capable de se **synchroniser avec d'autres systèmes du ministère** (annuaires, supervision, cloud interne, support, homologation) afin d'enrichir et de fiabiliser automatiquement les données.

Les grands chantiers de la feuille de route ci-dessous sont, sauf mention contraire, **prévus** et **non encore livrés** au moment de la rédaction. Le catalogue de données est, lui, **partiellement amorcé** : les modèles de données correspondants (`DataDescription`, `DataApplication`, `DataExposure`) sont déjà présents dans le schéma de la base.

- **Gestion fine des droits** _(prévu)_ : administration restreinte à un périmètre (par exemple une direction métier) et déclaration de **groupes** d'agents comme acteurs d'une application, en complément des acteurs individuels.
- **Import / export Excel en masse** _(prévu)_ : import en plusieurs phases (acteurs, conformités, applications et hébergements) avec mécanique d'upsert, et export de fiches produit avec traçabilité.
- **Chantiers d'intelligence artificielle** _(prévu)_ : exposition de l'API sous forme de **serveur MCP** (Model Context Protocol) pour interroger le référentiel en langage naturel, et **recherche full-text** progressivement assistée par un modèle de langage.
- **Catalogue de données** _(partiellement amorcé)_ : structuration et affichage de la cartographie des données produites et consommées par les applications.
- **Intégrations avec des systèmes externes du MI** _(prévu)_ : alimentation et synchronisation automatiques depuis des systèmes de supervision, de support usager, de cloud interne et d'autres référentiels du ministère.

Ces orientations confirment la vocation de RefApp : passer d'un catalogue documentaire à un **socle d'interopérabilité** au cœur du système d'information du ministère.

## Glossaire

Acronymes et termes utilisés dans le produit et dans cette documentation.

| Terme                 | Signification                                                                                                                                 |
| :-------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| **RefApp**            | Le Référentiel des applications (ce produit)                                                                                                  |
| **MI / DTNUM**        | Ministère de l'Intérieur / Direction de la Transformation Numérique du ministère de l'Intérieur                                               |
| **MOA / MOE**         | Maîtrise d'Ouvrage / Maîtrise d'Œuvre                                                                                                         |
| **TMA**               | Tierce Maintenance Applicative                                                                                                                |
| **RSSI / SSI**        | Responsable / Sécurité des Systèmes d'Information                                                                                             |
| **PO / PM**           | Product Owner / Product Manager                                                                                                               |
| **DPO / RGPD / AIPD** | Délégué à la Protection des Données / Règlement Général sur la Protection des Données / Analyse d'Impact relative à la Protection des Données |
| **RGAA**              | Référentiel Général d'Amélioration de l'Accessibilité                                                                                         |
| **DSFR**              | Système de Design de l'État                                                                                                                   |
| **IQ**                | Indice de Qualité d'une fiche application (0–100 %)                                                                                           |
| **DIMA / PDMA**       | Durée d'Indisponibilité Maximale Admissible / Perte de Données Maximale Admissible                                                            |
| **EcoIndex**          | Indicateur d'empreinte environnementale d'un service numérique                                                                                |
| **OIDC**              | OpenID Connect (protocole d'authentification)                                                                                                 |
| **ProConnect**        | Fédération d'identité interministérielle de l'État                                                                                            |
| **MAIA**              | Annuaire de référence des organisations et des agents (source de rattachement organisationnel — voir le modèle `OrganizationMaiaReference`)   |
| **MCD**               | Modèle Conceptuel de Données                                                                                                                  |
| **MCP**               | Model Context Protocol (exposition d'une API à un assistant IA)                                                                               |

---

Pour aller plus loin : [Architecture](./02-architecture.md) · [Démarrage](./03-demarrage.md) · [Modèle de données](./04-modele-de-donnees.md) · [API](./05-api.md) · [Permissions et sécurité](./06-permissions-et-securite.md) · [Fonctionnalités](./07-fonctionnalites.md).
