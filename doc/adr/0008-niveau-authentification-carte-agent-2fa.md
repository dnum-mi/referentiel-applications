# ADR-008 — Niveau d'authentification : carte agent ou double authentification

## Statut

Proposé — passera `Accepté` lorsque l'équipe SSO aura confirmé les valeurs du claim de mode d'authentification et leur présence sur l'access token.

## Date

2026-09-10

## Participants

Équipe RefApp — DNUM-MI

## Contexte et Problème

Le SSO de l'organisation admet plusieurs modes de connexion : carte agent, mot de passe avec double authentification, mot de passe seul. Le référentiel doit réserver les droits élevés (administration, écriture sur les fiches, impersonation, jetons) aux sessions ouvertes par carte agent ou double authentification, et ramener toute autre session aux droits d'un utilisateur standard (#1985).

Contraintes héritées : le backend ne valide que l'**access token** (ADR-0005, architecture sans état) ; le modèle de permissions est à trois couches cumulatives (ADR-0007) ; aucun secret ni valeur propre à un fournisseur ne doit figurer dans le code ; les valeurs exactes du claim de mode pour chaque cas de connexion ne sont pas encore confirmées par l'équipe SSO, ni sa présence sur l'access token, ni le support de `prompt=login`.

## Options Considérées

Critères : sécurité par défaut (jamais de fail-open), livraison sans dépendre de la confirmation SSO, activation réversible, cohérence avec le modèle de permissions existant, expérience compréhensible pour l'agent.

### Option 1 — Claim configurable et rétrogradation en mémoire, avec modes off / observe / enforce

Lire sur l'access token un claim de mode d'authentification déclaré côté fournisseur (nom et valeurs fortes configurables), en déduire un niveau, et en mode `enforce` réécrire en mémoire le principal de la requête vers un utilisateur standard avant tout calcul de droits. Un mode `observe` journalise sans appliquer.

Avantages : livrable inerte (`off` par défaut) ; mesure réelle avant activation ; retour arrière par variable d'environnement ; aucune valeur de fournisseur dans le code ; les trois couches de permissions restent intactes (pré-traitement du principal, pas une quatrième couche).

Inconvénients : deux variables obligatoires à renseigner par environnement ; la couche 3 (acteurs) ne dépend ni du rôle ni du périmètre et exige un point de coupe dédié.

### Option 2 — Refuser toute session non forte (403 systématique)

Avantages : simple. Inconvénients : contredit l'exigence « droits d'un utilisateur standard » ; exclut du référentiel les agents sans carte, alors que la consultation leur est utile.

### Option 3 — Déléguer aux rôles du fournisseur d'identité à niveau d'authentification minimum

Le fournisseur sait exiger un niveau minimum par rôle déclaré chez lui. Avantages : aucun code. Inconvénients : le référentiel gère ses rôles et ses acteurs en base, pas chez le fournisseur ; la couche 3 (acteurs par application) est inconnue du SSO. Reste un complément possible pour l'administration.

## Décision

- Retenir l'**option 1**. Le claim est lu sur l'**access token uniquement** (héritage de l'ADR-0005). Nom du claim, valeurs fortes, claim de fournisseur et fournisseurs de confiance sont **entièrement configurables** (`AUTH_LEVEL_*`), sans aucun défaut de valeur dans le code ; `AUTH_LEVEL_MODE` vaut `off` par défaut.
- **Un claim absent vaut faible**, sans variable qui le ferait valoir fort. La liste des fournisseurs fédérés de confiance (validée par le RSSI, portée par l'infrastructure) ne comble que l'**absence** de claim : un mode faible transmis reste faible.
- **Utilisateur standard** = rôle `VISITOR`, aucune permission individuelle, aucun périmètre, droits d'acteur limités aux **lectures** (un seul point de coupe, `resolveAppPermissions`). Rien n'est persisté : la réécriture est en mémoire, par requête.
- L'**impersonation** et la **création de jeton personnel** sont refusées en session faible par un **403 typé** `{ stepDown: true, reason }`, jamais un 401 (qui déclencherait la ré-authentification du front). Les jetons API existants sont des secrets B2B durables, hors périmètre de ce contrôle ; un attaquant en session faible peut révoquer les jetons de sa victime (réduction de privilèges, déni de service accepté).
- `GET /users/me` expose `authLevel { level, downgraded, reason }` et **jamais** le rôle, les permissions ou le périmètre d'origine : un attaquant tenant un mot de passe n'a pas à connaître le profil de privilèges de sa victime. Les routes qui décrivent l'utilisateur courant répondent depuis le principal de la session.
- Le front n'est **jamais source de vérité** : bandeau, profil et refus s'appuient sur `downgraded` ; la reconnexion forte force `prompt=login` (paramètres servis par `/config`), avec détection de boucle si le fournisseur renvoie la même session.
- Activation **progressive et réversible** : `observe` en integ puis qualif (au moins une semaine de `UserConnexionLog`, qui garde la valeur brute du claim), puis `enforce` en heure creuse. Repli si les claims n'étaient disponibles que par `userinfo` : lecture `userinfo` avec cache par jeton, à décider après la phase d'observation.

## Conséquences

- Avantages

* Le code livré est inerte et générique ; l'activation est un acte d'exploitation, environnement par environnement, sans release.
* Le modèle à trois couches et le guard restent inchangés ; la défense en profondeur tient en deux gardes d'une ligne (`assertIsAdministrator`, `TokenService.create`).
* La phase d'observation lève l'inconnue sur ce que le fournisseur transmet réellement, avant tout impact sur les agents.

- Inconvénients

* Tant que la confirmation SSO manque, aucun environnement ne peut passer en `enforce` ; le statut de cet ADR reste `Proposé`.
* Un agent sans carte ni double authentification perd ses droits d'acteur en écriture : décision à assumer auprès des équipes applicatives (variante « acteurs conservés » = retrait d'un filtre).
* Les jetons personnels créés en session forte contournent durablement ce contrôle ; suivi possible : durée de vie plus courte ou révocation administrateur.

## Liens et Références

- [Permissions et sécurité](../../docs/06-permissions-et-securite.md) — §1.4
- [Exploitation & déploiement](../../docs/12-exploitation-deploiement.md) — runbook d'activation
- [API](../../docs/05-api.md) — variables `AUTH_LEVEL_*`, payload 403 `stepDown`
- ADR-0005 (authentification OIDC), ADR-0007 (permissions à trois couches)
- Issue #1985
