# Qualification du niveau d'authentification avec IAP / Passage2

Ce guide complète [l'exploitation](./12-exploitation-deploiement.md) pour le ticket #1985. L'export PDF « IAP - Documentation », daté du 10 septembre 2026 et relu le 14 septembre, décrit les réglages du fournisseur ; il ne prouve pas quels réglages sont appliqués au client RefApp. Les tests Keycloak locaux ne remplacent pas la qualification de Passage2.

## Points établis par le document

- **Page 8, gestion des rôles** : un niveau minimum peut être demandé pour bénéficier d'un rôle Passage2. L'exemple élevé impose la carte agent ; le document ne précise pas le classement du TOTP dans ces niveaux.
- **Page 11, matrice des attributs** : la variable s'appelle `Auth-Mode`, avec `CARD` comme exemple. La matrice ne donne pas la liste exhaustive de ses valeurs, ni celle du parcours mot de passe + TOTP. Elle indique que les partenaires fédérés listés ne transmettent pas cet attribut et précise que la partie fédération est en cours de consolidation.
- **Pages 13 et 18, claims et scopes** : le nom du claim OIDC se choisit dans IAP à partir de la variable Passage2 ; les attributs sont transmis dans le scope `profile`. `auth_mode` est donc notre nom de mapping, pas un nom imposé par le document.
- **Page 18, signatures** : le texte cite RS256 ou HS256 pour les JWT ; la capture de découverte montre HS256, HS384 et HS512 pour `userinfo` et l'ID token. Cette capture ne détermine pas l'algorithme effectivement configuré pour RefApp, ni celui du jeton d'accès.
- **Reconnexion** : le document ne précise pas le comportement de `prompt=login` ni une valeur `acr_values` permettant d'exiger carte ou TOTP. La présence du claim `acr` dans la capture ne suffit pas à établir ce support.

## Valeur forte confirmée pour Passage2

Pour Passage2, `Auth_Mode` vaut `CARD` aussi bien pour la carte agent que pour RIO/mot de passe + TOTP. La configuration reste `AUTH_LEVEL_STRONG_VALUES=CARD` : aucune valeur MFA supplémentaire n'est nécessaire.

Pour le fournisseur Passage2 principal, avec `AUTH_LEVEL_TRUSTED_IDPS` vide :

| Parcours ou mode reçu     | Valeur du claim                  | Résultat en `enforce`                                  |
| ------------------------- | -------------------------------- | ------------------------------------------------------ |
| Carte agent               | `CARD`                           | Accès selon les droits RefApp du compte                |
| RIO/mot de passe + TOTP   | `CARD`                           | Accès selon les droits RefApp du compte                |
| Autre mode ou mode absent | Autre valeur ou absence de claim | Refus `403 strongAuthRequired` et écran de reconnexion |

Le mode `CARD` atteste donc les deux parcours forts. Ce seul attribut ne permet pas de distinguer une connexion par carte d'une connexion avec TOTP dans le journal.

## Configuration de l'environnement dans IAP

Utiliser la fiche RefApp et la configuration OIDC du bon environnement, en conservant son client existant. L'accès à IAP exige un accès Passage2 (RIO), le réseau RGT, le rôle utilisateur IAP et les droits de gérant de cette application. Un gérant externe sans RIO est un interlocuteur de Passage2, mais ne peut pas se connecter à IAP.

Dans « Déclaration des claims / scopes », ajouter ou vérifier les correspondances suivantes, puis sélectionner les deux claims dans le scope `profile` en conservant ses autres claims :

| Variable Passage2 | Nom de claim attendu par notre configuration |
| ----------------- | -------------------------------------------- |
| `Auth-Mode`       | `auth_mode`                                  |
| `Auth_Idp`        | `auth_idp`                                   |

Les noms des claims sont choisis dans IAP et doivent correspondre à `AUTH_LEVEL_CLAIM` / `AUTH_LEVEL_IDP_CLAIM`. RefApp demande déjà `openid profile email` ; aucun nouveau scope n'est nécessaire pour le fonctionnement décrit dans la documentation IAP.

Pour l'origine HTTPS de l'environnement, vérifier les retours de connexion `/oidc/callback` et `/oidc/silent-callback`, ainsi que l'origine de l'application comme retour de déconnexion. Le parcours « Se déconnecter puis se reconnecter » dépend de cette dernière URL.

Les modifications d'environnement passent par une **commande IAP**. Vérifier son état et la date effective d'intégration dans « Mes commandes ». Le guide annonce un délai maximal d'intégration de trois semaines ; enregistrer la configuration ne prouve pas sa mise en service.

## Format de userinfo et signatures

Activer `AUTH_LEVEL_USERINFO_FALLBACK=true` si les attributs ne sont pas sur le jeton d'accès. Le backend doit joindre le document de découverte, le JWKS et l'endpoint userinfo avec une chaîne TLS reconnue. `AUTH_LEVEL_USERINFO_URL` permet de fournir explicitement l'endpoint si nécessaire.

Sans configuration HMAC, RefApp accepte le JSON et les JWT signés avec les clés publiques du fournisseur. Si le client IAP est configuré pour signer **userinfo** avec un secret partagé :

| Variable serveur                     | Valeur                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| `AUTH_LEVEL_USERINFO_HMAC_ALGORITHM` | L'algorithme convenu avec Passage2 : `HS256`, `HS384` ou `HS512`                |
| `AUTH_LEVEL_USERINFO_CLIENT_SECRET`  | Le secret du client OIDC fourni par Passage2, injecté via la gestion de secrets |

Ces deux variables vont ensemble. Le secret doit contenir au moins 32, 48 ou 64 octets UTF-8 selon l'algorithme ; ses octets sont conservés sans normalisation. Une configuration incomplète ou invalide arrête le démarrage sans afficher le secret.

Le choix d'algorithme vient de la configuration serveur. Une signature faite avec une autre clé ou un autre algorithme est refusée. En mode HMAC, une réponse JSON non signée est également refusée. Les vérifications de sujet (`sub`), d'émetteur (`iss`) et d'audience (`aud`) restent obligatoires sur les réponses signées. Leur signature est vérifiée même lorsque la validation des jetons d'accès est désactivée pour un test local.

Ce secret n'est jamais transmis au frontend ou à `/config`, ni utilisé pour accepter des jetons d'accès à l'API RefApp. Il ne transforme pas non plus le client navigateur en client confidentiel : RefApp utilise actuellement Authorization Code + PKCE depuis le navigateur (`frontend/src/services/authentication.ts`). La cinématique des pages 17–18 décrit des échanges entre le serveur applicatif et Passage2, avec un identifiant et un secret client. Le flux actuel de RefApp n'est donc pas celui représenté dans ce document. Vérifier les réglages et les conditions d'intégration du **client RefApp existant** : s'il exige une authentification par secret lors de l'échange du code, cet échange doit être pris en charge côté serveur. La vérification HMAC de `userinfo` ne réalise pas cet échange de code. Ne pas placer ce secret dans le navigateur.

## Parcours de qualification

Le retour de l'équipe du 14 septembre 2026 signale que le parcours RIO/mot de passe propose un code TOTP en intégration, mais que Windows peut encore authentifier sans second facteur. La décision est donc de refuser toute consultation sans authentification forte attestée par RefApp, avec `CARD` comme valeur forte confirmée pour les deux parcours. `Auth_Mode`, `Auth-Mode` et `auth_mode` ne sont pas des alias automatiques : vérifier le nom exact publié dans IAP et utiliser ce nom dans `AUTH_LEVEL_CLAIM`. Garder `AUTH_LEVEL_TRUSTED_IDPS` vide pour le fournisseur Passage2 principal.

Déployer une version contenant #1985, appliquer ses migrations et commencer en `AUTH_LEVEL_MODE=observe`. Utiliser un compte RefApp possédant des droits d'administration ou d'écriture, afin de vérifier le refus d'accès puis la restitution des droits après reconnexion forte.

Pour chaque connexion carte agent, Windows seul, mot de passe seul et RIO/mot de passe + TOTP, relever le mode, le fournisseur et la source dans l'historique d'administration. Vérifier la transmission de `CARD` pour les deux parcours forts et le refus des parcours sans second facteur. Un niveau minimum de rôle IAP ne remplace pas la vérification des permissions internes de RefApp.

En `enforce`, `/users/me` doit aussi répondre `403 strongAuthRequired` pour les sessions faibles ou inconnues, sans identité ni droits. L’écran de reconnexion doit remplacer la recherche, les fiches et le profil ; aucune requête métier ne doit partir pendant la vérification initiale.

Tester en `enforce` en qualification : droits conservés avec carte agent ou RIO/mot de passe + TOTP, refus de toute consultation avec Windows ou mot de passe seul, refus d'administration/écriture/impersonation/création de jeton, puis rétablissement des droits après une vraie reconnexion forte. Vérifier aussi le retour sur la page demandée, le renouvellement silencieux et la persistance du message après une reconnexion restée faible et un rechargement.

Conserver `observe` tant que la qualification réelle n'est pas acquise. Le retour arrière consiste à rétablir `observe` et redémarrer les instances pour appliquer l'environnement.

## Références

- [Documentation IAP](https://iap.sso.minint.fr/documentation), export du 10 septembre 2026 : accès p. 1–5, attributs p. 11, claims/scopes et redirections p. 13, commandes p. 14, protocole/signatures p. 17–18.
- [OIDC Core, signatures](https://openid.net/specs/openid-connect-core-1_0.html#Signing) et [réponses userinfo](https://openid.net/specs/openid-connect-core-1_0.html#UserInfoResponse).
