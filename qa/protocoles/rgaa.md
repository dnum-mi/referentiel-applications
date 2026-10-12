# Protocole de non-régression — Accessibilité RGAA (`RGA-`)

> Parcours de non-régression associés aux critères **7.1**, **7.3**, **7.5**, **10.7**, **11.1**,
> **12.8** et **12.9** : formulaires, dialogues, recherche, pagination et filtres mobiles.
> RGA-06 nécessite l'application `QA-GROUP-PARENT` ; RGA-08 nécessite plusieurs pages de résultats.
> La configuration `playwright.rgaa.config.ts` réutilise les données présentes sans réinitialisation
> ni provisionnement. Session par défaut : `admin` / `pass`.

| Légende           |                                          |
| :---------------- | :--------------------------------------- |
| **Automatisé** ✅ | `e2e/tests/rgaa.spec.ts`                 |
| **Périmètre**     | 12 scénarios par navigateur (POM strict) |

Ces contrôles de comportement ne constituent pas une validation intégrale des critères RGAA.
La restitution effective avec les lecteurs d'écran de l'environnement de test reste à qualifier.

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

- **Action** : ouvrir la recherche mobile au clavier, parcourir ses commandes puis fermer avec Échap.
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

- **Action** : ouvrir et fermer les filtres à 375 pixels avec Entrée et Espace, parcourir le début du panneau au clavier, puis réduire la fenêtre alors qu'un filtre possède le focus.
- **Résultat attendu** : le panneau est initialement replié ; son bouton expose son état et le panneau contrôlé. Une fois ouvert, il précède les résultats sans les recouvrir. Le repli lors du redimensionnement restitue le focus au bouton.
