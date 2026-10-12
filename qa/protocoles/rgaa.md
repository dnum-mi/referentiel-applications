# Protocole de non-régression — Accessibilité RGAA (`RGA-`)

> Parcours de non-régression associés aux critères **7.1**, **7.3**, **7.5**, **10.7**, **11.1**,
> **12.1**, **12.3**, **12.6**, **12.7**, **12.8** et **12.9** : formulaires, dialogues, recherche,
> pagination, filtres mobiles, navigation publique, plan du site et exports.
> RGA-06 et RGA-13 nécessitent l'application `QA-GROUP-PARENT` ; RGA-08 nécessite plusieurs pages de résultats.
> La configuration `playwright.rgaa.config.ts` réutilise les données présentes sans réinitialisation
> ni provisionnement. Session par défaut : `admin` / `pass`.

| Légende           |                                          |
| :---------------- | :--------------------------------------- |
| **Automatisé** ✅ | `e2e/tests/rgaa.spec.ts`                 |
| **Périmètre**     | 19 scénarios par navigateur (POM strict) |

Ces contrôles de comportement ne constituent pas une validation intégrale des critères RGAA.
La restitution effective avec les lecteurs d'écran de l'environnement de test reste à qualifier.

Des contrôles complémentaires versionnés couvrent les modifications de données personnelles
(11.12) : les tests des formulaires acteurs/utilisateurs, campagnes et filtres sauvegardés
vérifient le refus sans écriture, la confirmation des valeurs courantes et la reprise après erreur.
Les créations ordinaires restent distinctes des modifications et suppressions.

`frontend/tests/authLevelAccess.spec.ts` vérifie aussi la conservation des saisies et du focus
pendant le renouvellement valide de la même session OIDC, puis l'abandon du contexte après
changement d'identité effective ou refus d'accès. Les tests du store couvrent les sessions
différentes, les jetons expirés, les échecs réseau et les réponses périmées. Ces contrôles ne
modifient pas la durée maximale de session du fournisseur d'identité.

---

### RGA-01 — Tab sans sélection — pas de piège clavier (textarea) ✅

- **Datafeature** : aucune (formulaire de création vierge, session `admin`).
- **Action** : connecté, ouvrir le formulaire de création d'application, mettre le focus dans le textarea Description et appuyer sur Tab sans saisir de texte.
- **Résultat attendu** : le focus quitte le textarea et se déplace vers l'élément suivant (pas de piège clavier, RGAA 12.9).
- **Variantes** : sélectionner du texte, puis vérifier que Tab et Maj+Tab quittent également le champ.

### RGA-02 — Attribut title visible sur le textarea (étiquette) ✅

- **Datafeature** : aucune (formulaire de création vierge, session `admin`).
- **Action** : connecté, ouvrir le formulaire de création d'application et inspecter l'attribut `title` du textarea Description.
- **Résultat attendu** : l'attribut `title` du textarea est égal à « Description » (étiquette explicite, RGAA 11.1).

### RGA-03 — Focus sur l'annonceur de titre après navigation SPA ✅

- **Datafeature** : aucune (chrome global, session `admin`).
- **Action** : connecté depuis la page d'accueil, déclencher une navigation SPA via la navigation principale (ex. vers Recherche d'applications).
- **Résultat attendu** : le composant `page-title-announcer` reçoit le focus programmatique après la navigation (RGAA 12.8).

### RGA-04 — Contenu de l'annonceur = titre de la nouvelle page ✅

- **Datafeature** : aucune (chrome global, session `admin`).
- **Action** : connecté depuis la page d'accueil, naviguer via la navigation principale vers Recherche d'applications.
- **Résultat attendu** : le texte de l'annonceur correspond au titre de la page cible (« Recherche d'applications », RGAA 7.1).

### RGA-05 — Dialogue de recherche mobile ✅

- **Action** : ouvrir la recherche mobile au clavier depuis son bouton puis depuis le raccourci « Aller à la recherche », parcourir ses commandes puis fermer avec Échap.
- **Résultat attendu** : le focus reste dans le dialogue ouvert et revient sur le bouton d'ouverture à la fermeture.

### RGA-06 — Suggestions de relation au clavier ✅

- **Datafeature** : application existante `QA-GROUP-PARENT`.
- **Action** : rechercher cette application dans le filtre de relation et choisir la suggestion au clavier.
- **Résultat attendu** : la suggestion est identifiée, sélectionnée et appliquée au filtre de recherche.

### RGA-07 — Focus pendant la recherche de signalements ✅

- **Action** : saisir une recherche et attendre la réponse de la liste des signalements.
- **Résultat attendu** : le champ reste focalisé après la mise à jour des résultats.

### RGA-08 — Pagination stable et état de page ✅

- **Datafeature** : plusieurs pages de résultats.
- **Action** : à 1 280 puis 375 pixels, activer au clavier page suivante, dernière page, page précédente et première page, en attendant chaque réponse.
- **Résultat attendu** : la commande utilisée garde le focus, y compris aux bornes ; les commandes indisponibles exposent `aria-disabled` et leur activation n'a aucun effet. La page courante expose `aria-current` et une région de statut contient « Page X sur Y ».

### RGA-09 — Filtres mobiles sans recouvrement des résultats ✅

- **Action** : ouvrir et fermer les filtres à 375 pixels avec Entrée et Espace, parcourir le début du panneau au clavier, le refermer à la souris alors qu'un filtre possède le focus, puis réduire la fenêtre alors qu'un filtre possède le focus.
- **Résultat attendu** : le panneau est initialement replié ; son bouton expose son état et le panneau contrôlé. Une fois ouvert, il précède les résultats sans les recouvrir. Le repli lors du redimensionnement restitue le focus au bouton.

### RGA-10 — Accès rapide à la navigation publique et connectée ✅

- **Action** : activer « Aller à la navigation » au clavier à 1 280 puis 320 pixels, sans session puis connecté.
- **Résultat attendu** : le premier lien du menu reçoit le focus sur grand écran. Sur mobile, le bouton Menu reçoit le focus ; Entrée ouvre le menu et Échap le ferme en rendant le focus au bouton. Une fois le menu fermé, Échap depuis un autre lien conserve le focus sur ce lien.

### RGA-11 — Plan du site public et accès rapide au contenu ✅

- **Action** : ouvrir le plan du site sans session, utiliser l'accès rapide au contenu, activer ses liens au clavier, puis utiliser le raccourci vers le pied de page.
- **Résultat attendu** : le plan propose Accueil et Accessibilité sans liens techniques OIDC. La tabulation après le raccourci contenu rejoint le premier lien du plan ; chaque lien mène à la page annoncée.

### RGA-12 — Destinations du plan connecté et gabarit commun ✅

- **Action** : connecté comme administrateur, activer successivement tous les liens publiés dans le plan du site et y revenir par le pied de page.
- **Résultat attendu** : chaque destination correspond à son intitulé et reste dans l'application ; les liens techniques OIDC sont absents. Le menu, la recherche et le lien Plan du site restent disponibles, avec le même ordre en-tête, navigation, contenu et pied de page.

### RGA-13 — Focus lors de l’export d’une fiche produit ✅

- **Datafeature** : application existante `QA-GROUP-PARENT` ; réponses d’export interceptées, sans appel métier au serveur.
- **Action** : lancer l’export HTML avec Entrée, tenter une seconde activation pendant l’attente, recevoir une erreur simulée, puis réessayer avec un téléchargement simulé réussi.
- **Résultat attendu** : la commande expose son indisponibilité et garde le focus pendant l’attente et après la réponse ; aucun export concurrent ne part. L’erreur est visible, puis la nouvelle tentative télécharge le fichier HTML attendu en conservant le focus.
