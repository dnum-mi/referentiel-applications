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

La campagne Windows NVDA/JAWS était un dispositif ponctuel de qualification. Son workflow
GitHub Actions a été retiré ; elle n'est plus exécutée automatiquement en CI. Les tests,
fixtures et outils restent versionnés dans `qa/at-windows/`, dont le README décrit le
dispositif historique. Ce retrait ne change ni les résultats obtenus ni les limites de
qualification ci-dessus. Les contrôles habituels de `Main CI` restent en place.

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

### RGA-10 — Navigation connectée et absence de bandeau public ✅

- **Action** : vérifier l'accueil à 1 280 puis 320 pixels sans session ; connecté, activer « Aller à la navigation » au clavier.
- **Résultat attendu** : sans session, aucun bandeau de navigation ni raccourci vers une navigation absente ; la déclaration d'accessibilité reste accessible dans le pied de page. Connecté, le premier lien du menu reçoit le focus sur grand écran. Sur mobile, le bouton Menu reçoit le focus ; Entrée ouvre le menu et Échap le ferme en rendant le focus au bouton. Une fois le menu fermé, Échap depuis un autre lien conserve le focus sur ce lien.

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

### RGA-14 — Un seul titre de niveau 1 par page ✅

- **Datafeature** : aucune (chrome global, session `admin`).
- **Action** : connecté depuis la page d'accueil, naviguer vers Recherche d'applications, puis recharger la page.
- **Résultat attendu** : la page n'expose qu'un titre de niveau 1, « Recherche d'applications ». Ni le titre de service du bandeau ni l'annonceur de navigation ne sont des titres (RGAA 9.1).

### RGA-15 — Un seul titre de niveau 1 au premier chargement d'une fiche ✅

- **Datafeature** : fixture `QA-GROUP-PARENT` (seed QA), session `admin`.
- **Action** : ouvrir directement l'URL de la fiche de l'application, sans navigation préalable.
- **Résultat attendu** : la page n'expose qu'un titre de niveau 1, le nom de l'application. L'annonceur de navigation n'est pas un titre et n'est pas vide (RGAA 9.1).

### RGA-16 — Titre dynamique annoncé après navigation vers une fiche ✅

- **Datafeature** : fixture `QA-GROUP-PARENT` (seed QA), session `admin`.
- **Action** : depuis Recherche d'applications, rechercher l'application puis ouvrir sa fiche depuis la liste.
- **Résultat attendu** : l'annonceur reçoit le focus et annonce « Profil d'application : <nom> ». Il n'est pas un titre. La page n'expose qu'un titre de niveau 1, le nom de l'application (RGAA 9.1, 7.1, 12.8).

### Parcours complémentaires — Configuration et synchronisation Grist

Ces parcours complètent les 19 scénarios automatisés ci-dessus. Les régressions des composants
sont couvertes dans `UserGristSettings.spec.ts`, `GristSyncModal.spec.ts`,
`ApplicationSearchActions.spec.ts` et `UserProfilePage.spec.ts`. Exercer les étapes suivantes
avec les réponses du profil et de Grist interceptées ; aucune clé réelle ni écriture externe
n’est nécessaire.

- **Configuration invalide** : ouvrir l’onglet Grist du profil, envoyer une URL HTTP et une clé vide.
  Les obligations sont indiquées avant saisie ; chaque erreur décrit le champ concerné,
  expose son invalidité et le premier champ invalide reçoit le focus. Une URL corrigée permet
  d’atteindre la clé manquante. L’identifiant de document annonce le format de 6 à 64 caractères.
- **Enregistrement différé** : soumettre une configuration valide avec une réponse retardée.
  L’attente est annoncée, le bouton conserve le focus et une seconde activation ne déclenche
  aucune autre requête. La reprise après réponse garde le clavier disponible.
- **Retrait de document ou de clé** : activer la suppression au clavier avec une réponse réussie
  simulée. La disparition du bouton replace le focus sur la saisie correspondante ; un déplacement
  volontaire vers un autre contrôle pendant l’attente est respecté.
- **Synchronisation** : ouvrir le dialogue depuis la recherche, parcourir les choix et commandes
  avec Tab et Maj+Tab, puis lancer une réponse différée en échec. Le focus reste dans le dialogue,
  les envois concurrents sont bloqués et l’erreur est annoncée. Échap rend le focus au déclencheur.
  Vérifier aussi l’échec de lecture des documents. Les boutons sont des éléments de liste valides.
- **Perte de permission** : retirer `GristSync` de la réponse de profil alors que l’onglet est actif.
  Un onglet disponible et son panneau sont sélectionnés ; si le focus était dans la partie retirée,
  il rejoint l’onglet conservé. Le focus ailleurs dans la page reste inchangé.
- **Réattribution de permission** : réaccorder `GristSync` sans recharger la page, puis ouvrir
  l’onglet avec Entrée et parcourir les onglets au clavier. L’onglet sélectionné et son panneau
  restent associés. Répéter deux cycles de retrait/réattribution, depuis un profil initialement
  autorisé puis non autorisé. Sans permission, aucun contrôle Grist n’est exposé.
- **Brouillon d’un autre onglet** : saisir un nom de token sans envoyer le formulaire, puis
  retirer et réaccorder `GristSync` dans les réponses simulées. La saisie, son focus et l’onglet
  actif sont conservés ; aucun token n’est créé. La barre d’onglets reste entièrement visible
  après l’ouverture du formulaire, y compris après la fin des animations de hauteur.
- **Petit écran** : à 320 pixels, vérifier le profil avec un identifiant de document de 64 caractères.
  Les labels, messages, champs et commandes restent visibles sans défilement horizontal de la page.
  Le défilement horizontal de la barre d’onglets permet toujours d’atteindre chaque onglet au clavier.
  Les flèches, Début et Fin déplacent la sélection sans faire défiler la page ni masquer l’onglet focalisé.

Les assertions DOM, les essais au clavier et l’analyse automatique de ces états ne remplacent
pas leur restitution par les lecteurs d’écran de la base RGAA.
