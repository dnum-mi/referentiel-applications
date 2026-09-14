# ADR-008 — Niveau d'authentification : carte agent ou double authentification

## Statut

Accepté le 2026-09-11, révisé le 2026-09-14 : refus de tout accès en session faible et confirmation de `CARD` pour carte agent et RIO/mot de passe + TOTP. L’activation du contrôle reste conditionnée à la qualification du SSO institutionnel décrite ci-dessous.

## Date

2026-09-10

## Participants

Équipe RefApp — DNUM-MI

## Contexte et Problème

Le SSO de l'organisation admet plusieurs modes de connexion. Le retour d'intégration du 14 septembre 2026 confirme qu'une authentification Windows sans second facteur reste possible malgré l'activation du TOTP sur le parcours RIO/mot de passe. La décision métier est désormais de ne montrer aucune donnée sans authentification forte. Elle remplace le choix initial de ramener ces sessions aux droits d'un utilisateur standard (#1985).

Contraintes héritées : le backend ne valide que l'**access token** (ADR-0005, architecture sans état) ; le modèle de permissions est à trois couches cumulatives (ADR-0007) ; aucun secret ni valeur propre à un fournisseur ne doit figurer dans le code. La valeur forte `CARD` est confirmée pour les deux parcours ; la présence du claim sur l'access token ou userinfo et le comportement de `prompt=login` restent à qualifier sur le client RefApp.

## Options et décision révisée

La rétrogradation vers un utilisateur standard, retenue initialement, ne répond plus à la décision métier : elle permettait encore la consultation du référentiel. Le contrôle du fournisseur reste nécessaire, mais le parcours Windows impose aussi un contrôle applicatif.

- En `enforce`, **refuser toutes les routes protégées** pour une session faible ou inconnue, y compris `GET /users/me`, les lectures, préférences et abonnements. `AuthMiddleware` répond avant de renseigner `req.user` et avant les contrôleurs. Aucun rôle n'est modifié en base.
- Répondre **403** avec `{ strongAuthRequired: true, authLevel: { level, downgraded: true, reason }, statusCode: 403, message }`, sans identité, droits, organisation ou claim brut. Le nom `downgraded` reste compatible avec le contrat existant mais signifie désormais que l'accès est refusé. Un 401 provoquerait une boucle de reconnexion SSO.
- Lire le mode sur l'access token validé ou, à défaut, sur userinfo avec ce même jeton. Les noms de claims et les valeurs fortes restent configurables. Pour Passage2, `CARD` couvre la carte agent et RIO/mot de passe + TOTP ; le backend exige ce mode fort pour la session courante.
- Garder `AUTH_LEVEL_TRUSTED_IDPS` vide pour Passage2 principal. La délégation explicite déjà prévue pour les fournisseurs fédérés ne comble que l'absence de mode ; un mode faible transmis prime toujours sur cette liste.
- Afficher un **écran de reconnexion** à la place des vues du référentiel. Attendre `/users/me` avant tout affichage de données et arrêter recherche, navigation et notifications en cas de refus. Les réponses des anciennes sessions ne doivent pas rétablir les données ni bloquer une nouvelle session forte.
- Conserver le retour à la destination demandée, la reconnexion avec `prompt=login`, puis la déconnexion SSO complète si le niveau reste faible. Une impersonation ouverte est clôturée hors maintenance et son état navigateur est effacé.
- Les jetons API existants restent hors du contrôle du niveau SSO. Les routes publiques de configuration et de santé restent disponibles. Les contrôles défensifs des services restent en place.
- `off` et `observe` gardent leur comportement sans blocage. Le passage à `enforce` exige la qualification de carte, Windows, mot de passe seul et TOTP. Aucun déploiement institutionnel n'est établi par les tests locaux.

### Choix arrêtés et qualification du SSO (révisés le 2026-09-14)

- **Valeurs du claim de mode.** Le PDF IAP donne `CARD` comme exemple pour l'attribut `Auth-Mode`. La valeur retenue pour les deux parcours forts, carte agent et RIO/mot de passe + TOTP, est `CARD`. La configuration reste donc `AUTH_LEVEL_STRONG_VALUES=CARD`, sans autre valeur MFA à ajouter. Le journal conserve le mode reçu ; ce seul attribut ne distingue pas ces deux parcours forts. Leur bon fonctionnement, la transmission des claims et le refus des parcours Windows / mot de passe seul restent à qualifier en integ puis qualif avant `enforce` ; les fixtures Keycloak et une configuration publiée ne constituent pas cette preuve.
- **Claims absents de l'access token.** Repli `userinfo` (`AUTH_LEVEL_USERINFO_FALLBACK`) : l'endpoint userinfo est interrogé avec le même jeton, au plus un appel par jeton toutes les cinq minutes, `sub` exigé, réponse JSON ou JWT signée vérifiée avec le JWKS (émetteur et audience obligatoires et contrôlés), seuls les claims manquants sur le jeton étant comblés, tout échec valant « claim absent ». C'est la cinématique décrite par la documentation d'intégration du SSO, qui sert les attributs à l'endpoint userinfo.
- **`prompt=login` non honoré.** Si une première reconnexion laisse la session faible, le bouton propose de lui-même une déconnexion complète de la session SSO suivie d'une nouvelle connexion (stratégie `logout`, bascule conservée dans l'onglet, imposable d'emblée par `AUTH_LEVEL_REAUTH_STRATEGY`).
- **Fournisseurs fédérés.** Aucun n'est de confiance par défaut (`AUTH_LEVEL_TRUSTED_IDPS` vide) ; en ajouter un reste une décision de sécurité tracée dans la configuration d'infrastructure. Un mode faible transmis par un fournisseur listé reste faible.
- **Signatures userinfo avec secret partagé.** La documentation IAP présente aussi HS256/HS384/HS512. Le backend les prend en charge uniquement avec un algorithme et un secret explicitement configurés (`AUTH_LEVEL_USERINFO_HMAC_ALGORITHM`, `AUTH_LEVEL_USERINFO_CLIENT_SECRET`). Le choix ne vient jamais du header JWT ; en mode HMAC, une réponse JSON est refusée. Le secret reste côté serveur et ne sert ni aux jetons d'accès à l'API ni à l'échange de code du client navigateur. Les réglages du client existant et l'intégration de la commande Passage2 sont à vérifier selon le [guide IAP](../../docs/13-integration-iap.md).

## Conséquences

- Une authentification Windows seule, un mode absent ou une valeur non reconnue n'accordent aucune consultation en `enforce`, même à un visiteur.
- Les droits enregistrés restent disponibles après une vraie reconnexion forte ; aucune migration n'est nécessaire pour ce changement de politique.
- Les utilisateurs dont le mode fort n'est pas correctement transmis seront également bloqués : qualifier le nom exact du claim, sa source et la transmission de `CARD` avant activation. Les noms `Auth_Mode`, `Auth-Mode` et `auth_mode` ne sont pas interchangeables automatiquement.
- `observe` sert au diagnostic, pas à la protection. Un retour à ce mode rétablit l'accès aux sessions faibles.
- Les jetons API durables restent une voie distincte d'authentification, avec leurs permissions existantes.

## Liens et Références

- [Permissions et sécurité](../../docs/06-permissions-et-securite.md) — §1.4
- [Exploitation & déploiement](../../docs/12-exploitation-deploiement.md) — runbook d'activation
- [API](../../docs/05-api.md) — variables `AUTH_LEVEL_*`, payload 403 `strongAuthRequired`
- ADR-0005 (authentification OIDC), ADR-0007 (permissions à trois couches)
- Issue #1985
