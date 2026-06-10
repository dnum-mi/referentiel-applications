# Audit RGAA — RefApp v1.75.0 (synthèse)

> Synthèse de l'audit d'accessibilité RGAA 4.1.2 de RefApp. Fichiers sources dans ce dossier : `declaration-accessibilite_v1.75.0.docx` (+ `.txt`), `grille-audit_v1.75.0.xls`, `rapport-audit_v1.75.0.pdf` (+ `.txt`).

## Cadre de l'audit

|                            |                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Référentiel**            | RGAA **4.1.2** (2023), grille 106 critères                                                             |
| **Réalisé par**            | BPSA (Bureau de Performance et Sécurité Applicative), DTNUM/SDAN                                       |
| **Auditeurs**              | Gaël Tanguy, Anthony Naudin                                                                            |
| **Période**                | 15/05/2026 → 05/06/2026 — « visite initiale »                                                          |
| **Version auditée**        | RefApp **1.75.0**, environnement **Intégration**                                                       |
| **Site**                   | `https://integration.referentiel-applications.interieur.rie.gouv.fr/`                                  |
| **Déclaration établie le** | 05/06/2026                                                                                             |
| **Environnement de test**  | Windows · NVDA 2025.3.2 · Firefox 140.5.0 ESR                                                          |
| **Outils**                 | WCAG Contrast Checker, Colour Contrast Analyser (CCA), HeadingsMap, Stylus, Web Developer, ARC Toolkit |

## Résultat global

> **52,54 % des critères respectés → « Partiellement conforme »**

- ✅ Conformes : **31** · ❌ Non conformes : **28** · ⚪ Non applicables : **47** · (sur 106)
- Mention à afficher sur **toutes les pages** (lien pied de page) : « Accessibilité : Partiellement conforme ».
- Aucune dérogation pour charge disproportionnée, aucun contenu exempté.

### Taux par page (11 pages de l'échantillon)

| Page                                         | Taux     | Page                                 | Taux |
| -------------------------------------------- | -------- | ------------------------------------ | ---- |
| P01 Accueil                                  | 75 %     | P07 Détail modification              | 71 % |
| P02 Accessibilité                            | 74 %     | P08 Créer une application (4 étapes) | 61 % |
| P03 Plan du site                             | 75 %     | P09 Mon Profil (3 onglets)           | 71 % |
| P04 Recherche d'application                  | 63 %     | P10 Time (graphique interactif)      | 61 % |
| P05 Fiche application ALERTE SMS (9 onglets) | **60 %** | P11 Admin (5 onglets)                | 65 % |
| P06 Modification (historique)                | 67 %     |                                      |      |

Les pages les plus complexes (fiche application avec onglets/modales/graphe, création multi-étapes, Time) sont les moins conformes.

## Les 28 critères non conformes (= la to-do accessibilité)

Regroupés par thématique — **c'est la feuille de route pour le frontend-dev** :

- **Images** : 1.3 (pertinence des alternatives textuelles), 1.6 (description détaillée si nécessaire).
- **Couleurs** : 3.1 (info pas uniquement par la couleur), 3.2 (contraste texte/fond), 3.3 (contraste des composants/éléments graphiques).
- **Tableaux** : 5.3 (linéarisation des tableaux de mise en forme), 5.8 (pas d'éléments de tableaux de données dans les tableaux de mise en forme).
- **Liens** : 6.1 (intitulés de liens explicites).
- **Scripts** : 7.1 (compatibilité technologies d'assistance), 7.3 (contrôle clavier + pointage), 7.5 (messages de statut restitués — ex. toasts/erreurs `aria-live`).
- **Éléments obligatoires** : 8.6 (titre de page pertinent), 8.7 (changement de langue dans le code), 8.9 (balises pas utilisées qu'à des fins de présentation).
- **Structuration** : 9.1 (structure par titres `h1…hn`), 9.2 (structure du document cohérente).
- **Présentation** : 10.2 (contenu visible présent sans CSS), 10.11 (pas de scroll à 256px haut / 320px large — reflow), 10.12 (espacement du texte redéfinissable).
- **Formulaires** : 11.1 (étiquette par champ), 11.2 (étiquette pertinente), 11.5 (regroupement des champs de même nature), 11.6 (légende de regroupement), 11.10 (contrôle de saisie pertinent), 11.11 (suggestions de correction d'erreur).
- **Navigation** : 12.6 (zones de regroupement atteignables/évitables — liens d'évitement), 12.8 (ordre de tabulation cohérent), 12.9 (pas de piège au clavier).

### Lecture pour le développement

Beaucoup de ces non-conformités sont des patterns **transverses** à corriger une fois dans les composants DSFR/maison :

- **Formulaires** (11.x) : 6 critères → revoir `DsfrInputGroup`/labels/légendes/messages d'erreur des modales et de la création d'application.
- **Couleurs/contraste** (3.x) : 3 critères → palette et composants graphiques (badges, graphe Time, charts).
- **Scripts/clavier** (7.x) + **navigation** (12.8/12.9) : composants interactifs (modales, onglets, autocomplete, graphe D3) — focus, pièges clavier, `aria-live` pour les statuts (cohérent avec la conventions « pas de toaster dans les formulaires » déjà adoptée par l'équipe).
- **Structuration** (9.x) + **titres** (8.6) : hiérarchie des titres par page/onglet.

## Points d'attention sur la déclaration (à finaliser avant publication)

Le `.docx` contient des **placeholders à compléter** avant publication officielle :

- Moyen de contact : « Envoyer un message [url du formulaire] » et « Contacter [Nom de l'entité] [url] » → à renseigner.
- Le lien schéma pluriannuel pointe sur celui générique du MI (2025-2027) — à spécialiser si besoin.
- La déclaration doit être publiée sur la **page `/accessibilite`** dans un format accessible, et la mention « Partiellement conforme » présente en pied de page sur **toutes** les pages.
- Voies de recours (Défenseur des droits) : déjà renseignées.

## Lien avec le projet

- Confirme la mention vue dans le canal tech : **rapport d'audit RGAA reçu vers le 08/06/2026**, accessibilité = axe de conformité fort (27 tickets `Accessibilité` au backlog).
- L'audit porte sur l'**environnement d'intégration** en v1.75.0 ; les corrections alimenteront le plan annuel d'accessibilité 2025 du MI.
