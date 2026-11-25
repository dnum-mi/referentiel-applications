# Régression des défauts relevés pendant l’audit manuel du 25 novembre 2026

Ces parcours reprennent les quatre défauts reproduits dans Chrome sur REFAPP 1.106.0
(`f1534bcb`). Ils portent sur les critères RGAA 7.3, 8.2, 9.1, 10.4, 10.11 et 12.8.
Ils ne constituent pas une nouvelle qualification intégrale du RGAA : les essais de
restitution vocale et les autres réserves de l’audit restent ouverts.

Utiliser un compte de recette autorisé et des données fictives. Le catalogue doit
contenir plusieurs applications avec IQ, priorité et hébergement renseignés ; TIME
doit contenir des évaluations. Ne pas exécuter de création sur des données réelles.

## Catalogue : informations et tris conservés

1. À 1 280 px, ouvrir le catalogue avec les colonnes IQ, Nom, Priorité, Hébergement
   et Tags. Relever les valeurs de deux applications.
2. Réduire la largeur à 320 px. Le même tableau reste disponible dans une zone de
   défilement locale, sans élargir la page entière.
3. Atteindre cette zone au clavier et la faire défiler horizontalement. Vérifier
   les valeurs de toutes les colonnes et activer un tri avec Entrée.
4. Changer les colonnes affichées, puis revenir dans les résultats. Les valeurs et
   tris des colonnes sélectionnées restent disponibles.
5. Revenir au format large et régler le **zoom natif de Chrome à 200 %**. Vérifier
   à nouveau les informations et tris ; restaurer ensuite le zoom à 100 %.
6. Vérifier la pagination et un filtre produisant zéro résultat. Les commandes et
   le message de résultat restent utilisables.

Les tableaux de données conservent leurs relations entre lignes et colonnes ; le
défilement horizontal est limité à leur conteneur. Le changement de présentation
ne supprime plus les informations individuelles au profit de cartes incomplètes.

## TIME : ancre, ouverture et focus durables

1. Ouvrir `/time` sans fragment et attendre les points du diagramme.
2. Atteindre « Consulter le tableau complet du diagramme TIME » au clavier et
   appuyer sur Entrée.
3. Vérifier l’ouverture du tableau et son focus, puis attendre au moins une
   seconde pour couvrir le délai du rechargement qui provoquait le défaut.
4. Le tableau reste ouvert, son identifiant correspond toujours au fragment de
   l’URL et la tabulation poursuit depuis cette cible.
5. Modifier réellement le millésime ou un filtre. Les résultats sont bien
   rechargés ; la correction ne neutralise pas les changements de recherche.

## Messages de succès : aucun titre vide

1. Créer ou modifier une technologie fictive depuis une fiche de recette.
2. Vérifier que le message de succès contient son texte et une commande de
   fermeture. Inspecter les titres exposés et le DOM : aucun titre vide n’est créé.
3. Fermer le message au clavier.

Les tests unitaires couvrent également les titres absents, vides, composés
d’espaces et explicitement renseignés, pour les succès et les erreurs, avec le
composant DSFR réel. Les régions de statut restent présentes.

## Dates de fiche : structure HTML valide

1. Ouvrir une fiche possédant ses métadonnées de création et de modification.
2. Vérifier que les deux dates et leurs auteurs sont toujours affichés dans le
   bloc de mise en avant.
3. Dans le DOM rendu, `[data-testid="application-metadata-highlight"]` est un bloc
   `.fr-highlight`. Aucun paragraphe n’englobe de `div` ni d’autre paragraphe.
4. Ouvrir l’onglet Technologies avec un résumé de fin de vie renseigné : les badges
   restent affichés dans `technology-summary`, sans paragraphe englobant les
   paragraphes générés par DSFR.

## Vérifications automatisées associées

- `AppToaster.spec.ts` et `ApplicationPage.metadata.spec.ts` vérifient la structure
  rendue et les contenus accessibles.
- `TechnologyTab.spec.ts` vérifie aussi la structure du résumé avec les vrais
  badges DSFR.
- `use-application-search.navigation.spec.ts` utilise Vue Router et le diagramme
  réel pour conserver la cible après une ancre, tout en rechargeant un vrai filtre.
- Les tests du catalogue et de `RefAppTable` couvrent la conservation du tableau
  et l’accès au défilement.

Exécuter aussi le lint, le contrôle TypeScript et la compilation du frontend sous
la version Node définie dans `.nvmrc`. La réussite de ces contrôles ne remplace pas
les parcours manuels ci-dessus.
