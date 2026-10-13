# Restitution native NVDA / Firefox

Ce pilote exécute NVDA 2026.2 en français avec Firefox visible sur un runner GitHub Windows Server 2022 x64. Il contrôle les annonces de sept figures, trois alternatives HTML et des interactions des composants de RefApp. Les données sont entièrement fictives ; aucune base, API métier, session RefApp ou donnée locale n'est transmise au runner.

## Exécution

Le workflow `RGAA real NVDA Firefox French` se déclenche au push des fichiers du pilote sur le commit exact poussé. Après présence du workflow sur la branche par défaut, `workflow_dispatch` permet également de fournir un SHA produit complet. Deux checkouts distinguent le pilote du produit évalué. Le runner est standard, éphémère et réservé aux dépôts publics, avec une permission de lecture du dépôt seulement.

Le workflow installe les dépendances verrouillées, contrôle leurs types et leur lint, configure le runner avec Guidepup, puis installe NVDA et Firefox. Un témoin avec nom accessible aléatoire, rôle français et activation annoncée doit passer avant les dix lectures de contenu. Les tests n'ont aucun retry. Les versions, processus, sessions Windows, phrases natives, captures et traces sont archivés avec le SHA évalué. Chaque test attend la fin effective du processus NVDA avant la création du profil suivant. Le contrôle final vérifie également l'arrêt du lecteur.

Les annonces sont les messages `speak` du protocole Remote natif de NVDA capturés par Guidepup, soit les chaînes envoyées à la synthèse. Elles ne sont pas reconstruites depuis le DOM. Ce dispositif ne constitue pas un enregistrement acoustique.

Le journal Guidepup enregistre les fenêtres de capture actives. Les réponses réseau libérées par le banc et les attentes asynchrones utilisent explicitement sa méthode de capture externe ; une simple attente DOM ne prouve pas qu’aucune annonce n’a été produite. Les appuis du lecteur gardent leur capture native et ne sont pas imbriqués dans une capture externe, car ces opérations partagent la même file.

Pour transmettre volontairement une touche à l’application, le pilote utilise la commande native NVDA « ignorer la prochaine combinaison de touches ». La touche suivante est envoyée sans capture : Guidepup 0.35 ajoute sinon une touche Contrôle qui consomme cette commande avant la touche attendue. Le rapport de focus qui suit est une lecture explicite du lecteur, conservée séparément des annonces spontanées. Les lectures longues utilisent des déplacements natifs bornés pour éviter qu’une capture interrompe prématurément « Dire tout ».

Un journal complémentaire relève les événements de focus et de clic de la page fictive, avec uniquement le type de contrôle, son identifiant, son rôle et son nom accessible. Il ne déplace pas le focus et ne relève ni les valeurs saisies ni les touches. Ce diagnostic DOM aide à expliquer un échec ; il ne remplace jamais la parole native.

## Sources et fixtures

`tools/verify-inputs.mjs` compare les empreintes SHA256 des sources et générateurs au checkout produit, puis celles des dix HTML et du CSS. Tout changement exige de régénérer les fixtures et de vérifier leur provenance avant qualification. Le répertoire `fixtures/` est exclu du formatage pour préserver exactement ses octets.

Les figures sont des copies du DOM des vrais composants, rendus avec des réponses GET fictives. Les documents sont les sorties exactes des générateurs alimentés par des objets fictifs. Les manifestes, entrées et oracles documentent ce périmètre. Aucun gestionnaire d'événement Vue n'est conservé dans ces copies statiques : elles vérifient la restitution des images et documents, pas les interactions de RGAA 7.1.2. Les bitmaps des canvas ne sont pas redessinés dans ce pilote.

Les groupes indépendants du job `nvda-interactive` servent le client du checkout produit avec Vite et montent ses composants Vue réels. Le serveur utilise un cache propre à son processus et désactive le rechargement de développement de ce checkout figé ; cette configuration ne modifie pas le produit. Les boutons, formulaires, graphiques et gestionnaires d'événements sont exécutés. Les réponses de l'API sont interceptées, y compris les erreurs et écritures simulées ; les autres requêtes métier sont bloquées. Les icônes proviennent d'une copie du paquet public dont la licence et la provenance sont conservées dans `fixtures/ri-*`. Les annonces restent celles de NVDA ; les assertions DOM complémentaires vérifient l'effet concret de l'action. Le code de montage ne constitue pas une preuve de fonctionnement d'une API réelle.

Le scénario de navigation U01 conserve l’application déjà montée par `main.ts`, son routeur et son store. Il prépare l’identité fictive par le vrai gestionnaire de lecture du profil, puis exerce les raccourcis, changements de route, menu compact et thème sans créer une deuxième instance de l’application.

Dans le scénario d’échec de reconnexion, le SDK OIDC réel appelle `window.stop()`. Firefox coupe alors le WebSocket du client de développement Vite, qui recharge la scène même avec `server.hmr: false`. La préparation de ce scénario ferme donc dès son ouverture uniquement le WebSocket Vite de l’origine locale, de chemin `/` et portant le paramètre `token`. L’arrêt demandé par le SDK et les gestionnaires applicatifs restent exécutés ; la prévalidation Firefox confirme l’erreur visible et le focus conservé après le refus simulé.

Chaque scénario, interactif ou statique, démarre désormais dans un processus Playwright distinct, avec un nouveau navigateur et un nouveau lecteur, puis attend leur fermeture avant le suivant. L'inventaire, les rapports individuels et le rapport agrégé restent conservés ; aucun scénario n'est réessayé. Cette isolation traite les interférences de préparation observées entre scénarios, sans transformer leurs anciens échecs en réussites. Les saisies fictives utilisent des caractères ASCII, car la méthode `type` du pilote Windows écrit un script WScript.SendKeys sans contrat Unicode ; les contenus, libellés et annonces évalués restent ceux du produit en français.

Le placement initial du curseur contrôle le titre natif de Firefox, clique un point de contenu vérifié hors des commandes interactives, puis exige la confirmation parlée du mode navigation NVDA. Le tampon est rafraîchi seulement pour les contenus statiques. La préparation conserve séparément ses annonces et contrôle que le document n’a pas été rechargé pendant chaque étape. Sur le build évalué, `F6` laisse le focus dans la barre d’adresse ; ce comportement a été conservé dans les diagnostics des essais précédents. Le clic sert uniquement à préparer la lecture et ne vaut pas preuve de navigation au clavier. Les activations évaluées ensuite sont des commandes natives du lecteur. Pour les SVG, la lecture rapide est complétée par la commande NVDA de lecture de l'objet courant, afin d'entendre sa description. Ces commandes sont décrites dans le [guide NVDA](https://download.nvaccess.org/documentation/userGuide.html#ObjectNavigation) et les [raccourcis Firefox](https://support.mozilla.org/en-US/kb/keyboard-shortcuts-perform-firefox-tasks-quickly).

Les contrôles locaux du pilote, sans démarrer NVDA, sont :

```sh
pnpm --dir qa/at-windows install --frozen-lockfile --ignore-scripts
pnpm --dir qa/at-windows type-check
pnpm --dir qa/at-windows lint
pnpm --dir qa/at-windows format:check
```

L'exécution des essais exige Windows, GitHub Actions et `RGAA_ALLOW_WINDOWS_AT=1`. Elle refuse un processus NVDA préexistant. Ne pas lancer la configuration du lecteur sur un poste personnel.

## Portée des résultats

Les lectures de contenu contribuent aux tests RGAA 1.3.8, 1.6.6, 1.6.8 et 13.3.1. Les cas interactifs contribuent à 7.1.2 et aux alternatives des graphiques. Ils ne produisent pas automatiquement un taux de conformité. La [base RGAA](https://accessibilite.numerique.gouv.fr/methode/environnement-de-test/) inclut également JAWS et VoiceOver/Safari ; les variantes et interactions non exercées restent à qualifier séparément.

Windows Server 2022 est pris en charge par le [guide NVDA](https://download.nvaccess.org/documentation/userGuide.html). Firefox installé par [Playwright](https://playwright.dev/docs/browsers#firefox) est un build patché ; sa version effective est enregistrée et cette différence avec une installation Mozilla standard doit rester déclarée dans l'audit.

Le montage s'appuie sur le [workflow du mainteneur Guidepup](https://github.com/guidepup/guidepup/blob/3ac497d502a468d092aff3e67cbe126d27989fcf/.github/workflows/playwright-nvda.yml). Le bundle NVDA `0.2.1-2026.2` est épinglé par Guidepup 0.35.0 ; son SHA256 attendu est `7df0ca3c1c9e8c6521bc7553486ca360ed6f0b4f9bdbd6603131e38b5c1497a1`. La version du processus réel, son empreinte et la langue du profil sont contrôlées pendant les essais.

Les scènes interactives installent le paquet frontend verrouillé puis génèrent explicitement son client API depuis `frontend/openapi/swagger.yaml`, avant le démarrage de Vite. Cette préparation ne contacte aucun backend. Les hôtes de test reprennent la configuration française PrimeVue du produit et refusent un module indisponible avant toute interaction native.

## Préparation de JAWS

Un job indépendant acquiert l'installateur multilingue officiel JAWS 2025.2508.120.400. Il vérifie le lien du catalogue de l'éditeur, la taille, le SHA256, les versions PE et la signature Authenticode Windows. Il conserve seulement les métadonnées dans les artefacts ; le binaire reste dans le dossier temporaire du runner. Cette étape n'exécute pas l'installateur et ne produit aucun résultat de restitution JAWS. L'installation et l'utilisation nécessitent une décision distincte sur la [licence applicable](https://vispero.com/jaws-end-user-license-agreement/).

Un job de démonstration JAWS est préparé, inactif lors des poussées ordinaires et interdit en réexécution. Son lancement exige une autorisation explicite de la licence et le déclencheur dédié. Il installe le paquet signé en français, limite l’essai à moins de 35 minutes et vérifie un nom aléatoire ainsi que le rôle français dans le véritable historique vocal. Aucune activation commerciale ni aucun achat ne sont effectués. Une installation ou un témoin réussi ne qualifie pas les critères RGAA ; un redémarrage demandé ou un témoin absent est consigné comme résultat limité.

Après le témoin, la même instance JAWS lit les sept figures et les trois documents. Chaque capture conserve les états bruts de l’historique avant effacement, après effacement et après action. Les annonces directes d’images restent distinctes du visualiseur natif d’informations détaillées ; aucun OCR ni texte DOM ne constitue une parole. Le dernier diagnostic réserve au plus quatre minutes aux contenus, dans le budget total du job de dix minutes. Les pieds de page, données attendues et associations des 14 tableaux sont contrôlés séparément ; toute lecture partielle reste explicite et exige une revue avant qualification RGAA.

Les sept premiers jobs JAWS ont duré 270, 290, 232, 53, 314, 283 et 286 secondes, soit 28 min 48 s au total, préparation comprise. Le septième a passé le précontrôle réel Windows PowerShell 5.1 et obtenu une vraie annonce fraîche dans l’historique vocal du même processus JAWS : le nom fictif aléatoire suivi du rôle anglais « Button ». Le contrôle du rôle français a échoué ; aucun des dix contenus n’a été parcouru. Les 20 événements clavier ont été acceptés par Windows, et le nettoyage final ne trouve plus de lecteur. Ces éléments prouvent cette annonce native, sans qualifier les tests RGAA.

Les ressources françaises installées sont confirmées par les métadonnées MSI et le registre, mais le profil de langue actif n’a pas été relevé. Le premier lancement explicite ajoute désormais `/lfra`, conformément à la [documentation de l’éditeur](https://support.freedomscientific.com/support/technicalsupport/bulletin/1015). Ce correctif a été vérifié syntaxiquement et reste à exécuter. Les gardes sur les dialogues réellement observés sont conservées. Le solde de 6 min 12 s de l’essai initial est inférieur aux 7 min 19 s de pauses mécaniques minimales du protocole complet, hors préparation et lecture supplémentaire. Une nouvelle exécution exige donc une autorisation de durée complémentaire ; aucune relance automatique n’est prévue.

La préparation vérifie désormais le titre unique de la fenêtre Firefox, son exécutable, sa session et sa filiation, puis conserve le même processus JAWS pour toutes les lectures. Elle archive le texte et les boutons réels des dialogues. Le redémarrage initial ne peut être reporté que si l’éditeur expose une commande explicite « Non » ou « Plus tard » ; le bouton exact du mode démonstration est ensuite atteint par Tabulation et Entrée. Aucun redémarrage, renouvellement de démonstration ou achat n’est effectué. Le retour MSI 3010 et la consigne de redémarrage du guide de l’éditeur restent des réserves non résolues ; la présence d’annonces natives ne suffit pas à déclarer cette préparation entièrement qualifiée.
