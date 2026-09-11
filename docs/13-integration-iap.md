# Qualification du niveau d'authentification avec IAP / Passage2

Ce guide complète [l'exploitation](./12-exploitation-deploiement.md) pour le ticket #1985. La documentation IAP consultée le 10 septembre 2026 décrit les réglages du fournisseur ; elle ne prouve pas quels réglages sont appliqués au client RefApp. Les tests Keycloak locaux ne remplacent pas la qualification de Passage2.

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

Ce secret n'est jamais transmis au frontend ou à `/config`, ni utilisé pour accepter des jetons d'accès à l'API RefApp. Il ne transforme pas non plus le client navigateur en client confidentiel : RefApp utilise actuellement Authorization Code + PKCE depuis le navigateur. La documentation IAP décrit aussi un échange serveur avec secret ; il faut confirmer le type du **client RefApp existant**. Si celui-ci exige une authentification par secret lors de l'échange du code, un raccordement serveur est nécessaire. Ne pas placer ce secret dans le navigateur.

## Parcours de qualification

Déployer une version contenant #1985, appliquer ses migrations et commencer en `AUTH_LEVEL_MODE=observe`. Utiliser un compte RefApp possédant des droits d'administration ou d'écriture, afin de pouvoir vérifier ensuite leur réduction.

Pour chaque connexion carte agent, mot de passe seul et mot de passe avec second facteur, relever le mode, le fournisseur et la source dans l'historique d'administration. `CARD` est le seul exemple de mode donné par le guide IAP ; la valeur MFA doit être observée ou confirmée par Passage2 avant de l'ajouter à `AUTH_LEVEL_STRONG_VALUES`. Un niveau minimum de rôle IAP ne remplace pas la vérification des permissions internes de RefApp.

Après validation des valeurs, tester en `enforce` en qualification : droits conservés avec carte/MFA, droits standard avec mot de passe seul, refus d'administration/écriture/impersonation/création de jeton, puis rétablissement des droits après une vraie reconnexion forte. Vérifier aussi le retour sur la page demandée, le renouvellement silencieux et la persistance du message après une reconnexion restée faible et un rechargement.

Conserver `observe` tant que la qualification réelle n'est pas acquise. Le retour arrière consiste à rétablir `observe` et redémarrer les instances pour appliquer l'environnement.

## Références

- [Documentation IAP](https://iap.sso.minint.fr/documentation), export du 10 septembre 2026 : accès p. 1–5, attributs p. 11, claims/scopes et redirections p. 13, commandes p. 14, protocole/signatures p. 17–18.
- [OIDC Core, signatures](https://openid.net/specs/openid-connect-core-1_0.html#Signing) et [réponses userinfo](https://openid.net/specs/openid-connect-core-1_0.html#UserInfoResponse).
