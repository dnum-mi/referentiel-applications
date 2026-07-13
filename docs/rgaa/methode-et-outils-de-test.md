# Méthode & outils de test RGAA (référence transverse)

> **Sous-issue de #1767 — Audit RGAA 4.1.2 (v1.75.0).** Référence transverse, **à lire avant de corriger ou de valider un lot**.
>
> Docs sœurs : [synthèse de l'audit](./audit-rgaa-v1.75.0.md) · [matrice critères × pages](./matrice-criteres-pages_v1.75.0.md) · [tickets par lot](./tickets-rgaa-v1.75.0.md).

## Pourquoi ce document

Chaque non-conformité doit être **reproduite** avant correction puis **re-testée après correction**, avec les **mêmes outils que les auditeurs** et dans un environnement proche du leur. Les outils automatiques (axe, ARC Toolkit…) ne couvrent qu'une **partie** des critères RGAA : la validation finale d'un critère d'interaction se fait toujours au **lecteur d'écran + clavier**, à la main.

Objectif : qu'une correction validée en local le soit aussi lors de la contre-visite de l'audit.

## Environnement de référence (celui de l'audit)

|                 |                         |
| --------------- | ----------------------- |
| Système         | **Windows**             |
| Lecteur d'écran | **NVDA 2025.3.2**       |
| Navigateur      | **Firefox 140.5.0 ESR** |

> Toute correction doit **au minimum** être revérifiée sur cette combinaison (ou, à défaut, **NVDA + Firefox récents**). NVDA est gratuit ([nvaccess.org](https://www.nvaccess.org/download/)) ; Firefox ESR est disponible sur [mozilla.org](https://www.mozilla.org/firefox/enterprise/).
>
> VoiceOver (macOS) ou Orca (Linux) peuvent dépanner pour un premier repérage, mais **ne remplacent pas** la validation NVDA/Firefox : les restitutions diffèrent.

## Outils par famille de critères

Les outils ci-dessous sont ceux effectivement utilisés dans l'audit et référencés dans les tickets par lot.

### Contraste (critères 3.2, 3.3)

- **Colour Contrast Analyser (CCA)** — pipette écran, mesure le ratio texte/fond **et** les états au survol/focus. [Télécharger (TPGi)](https://www.tpgi.com/color-contrast-checker/).
- **WCAG Contrast Checker** — extension Firefox, scan de la page.
- Seuils : **≥ 4.5:1** (texte), **≥ 3:1** (texte ≥ 24 px, ou ≥ 18,5 px **gras**), **≥ 3:1** (composants d'interface et éléments graphiques porteurs d'information — bordures de champ, icônes, séries de graphe). **Tester aussi les états `hover`/`focus`.**

### Structure, sémantique & titres (critères 8.x, 9.x, 12.x)

- **HeadingsMap** — extension : arborescence des titres `<h1>…<h6>` et des landmarks. Un seul `<h1>`, pas de saut de niveau.
- **ARC Toolkit** — extension d'audit semi-automatique (rôles ARIA, noms accessibles, tableaux, régions).
- **Web Developer** — extension : « Outline headings », désactiver les CSS, mettre en évidence les éléments sans `alt`, etc.
- **axe DevTools** — scan automatique rapide (complément, ne dispense pas du test manuel).

### Navigation clavier (critères 7.3, 12.8, 12.9)

- **Clavier seul** (sans souris) : `Tab` / `Maj+Tab` pour parcourir, `Entrée`/`Espace` pour activer, `Échap` pour fermer une modale.
- À vérifier : **ordre de tabulation** cohérent avec l'ordre visuel, **focus visible** à chaque étape, **aucun piège clavier** (on peut toujours ressortir d'un composant), retour du focus après fermeture d'une modale/action.

### Restitution lecteur d'écran (critères 7.x, 9.x, 11.x, statuts `aria-live`)

- **NVDA** (le plus utilisé dans l'audit). Commandes de base :

| Raccourci NVDA                                    | Effet                                         |
| ------------------------------------------------- | --------------------------------------------- |
| `NVDA` = `Inser` (ou `CapsLock` en mode portable) | Touche de modification NVDA                   |
| `Tab` / `Maj+Tab`                                 | Élément interactif suivant / précédent        |
| `H` / `Maj+H`                                     | Titre suivant / précédent                     |
| `D` / `Maj+D`                                     | Landmark (région) suivant / précédent         |
| `F` — `B` — `K` — `T`                             | Champ de formulaire — bouton — lien — tableau |
| `NVDA+Espace`                                     | Bascule mode navigation / mode formulaire     |
| `NVDA+F7`                                         | Liste des éléments (titres, liens, landmarks) |
| `NVDA+Flèche bas`                                 | Lecture continue                              |

- Vérifier que chaque contrôle a un **nom accessible** pertinent, que les messages de statut sont annoncés (`aria-live`), et que rien d'important n'est **muet**.

## Méthode de validation d'un lot

1. **Reproduire** la non-conformité sur l'environnement de référence, en suivant le « 🔁 Reproduire » du ticket du lot.
2. **Corriger** dans le code (privilégier les composants/variables **DSFR** plutôt que du custom).
3. **Re-tester** avec l'outil indiqué au « 🧪 Tester » du ticket, sur **NVDA + Firefox** pour tout critère d'interaction.
4. **Vérifier la non-régression** : le correctif ne casse ni le rendu ni les autres critères de la page.
5. **Cocher la Définition du fini** du ticket et référencer la PR.

> Un critère n'est **conforme** que s'il l'est sur **toutes** les pages de l'échantillon où il s'applique (cf. [matrice](./matrice-criteres-pages_v1.75.0.md)). Corriger un composant transverse (ex. un badge, `DsfrInputGroup`) vaut souvent pour plusieurs pages à la fois.

## Aide-mémoire des seuils

| Critère                                          | Exigence                                                       |
| ------------------------------------------------ | -------------------------------------------------------------- |
| 3.2 — contraste texte                            | ≥ **4.5:1** (≥ **3:1** si ≥ 24 px, ou ≥ 18,5 px gras)          |
| 3.3 — contraste éléments graphiques / composants | ≥ **3:1** avec les couleurs adjacentes                         |
| 3.1 — information par la couleur                 | l'information ne doit **pas** passer uniquement par la couleur |
| 12.8 — ordre de tabulation                       | cohérent avec l'ordre visuel/logique                           |
| 12.9 — piège clavier                             | on peut toujours sortir d'un composant au clavier              |
| 8.6 / 9.1 — titres                               | un seul `<h1>`, hiérarchie sans saut de niveau                 |

## Voir aussi

- [Synthèse de l'audit RGAA v1.75.0](./audit-rgaa-v1.75.0.md)
- [Matrice critères × pages](./matrice-criteres-pages_v1.75.0.md)
- [Tickets RGAA par lot](./tickets-rgaa-v1.75.0.md)
- [RGAA 4.1.2 — critères et tests](https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/)
