# Durées des sessions de connexion

Le realm de développement `referentiel-applications` propose, avant connexion, une case native permettant de prolonger la durée d'inactivité. Le libellé précise la durée et réserve ce choix à un appareil personnel : « Prolonger ma connexion jusqu’à 24 heures (appareil personnel) », ou son équivalent anglais. La case reste facultative et décochée lors d'une nouvelle connexion.

| Limite                       | Connexion ordinaire        | Case de prolongation cochée |
| ---------------------------- | -------------------------- | --------------------------- |
| Inactivité SSO               | 30 minutes                 | 24 heures                   |
| Maximum SSO                  | 24 heures                  | 24 heures                   |
| Inactivité et maximum client | Héritage de la branche SSO | Héritage de la branche SSO  |
| Jeton d'accès                | 5 minutes                  | 5 minutes                   |

L'inactivité mesurée par Keycloak est celle entre les authentifications ou les renouvellements de jetons. Le renouvellement automatique effectué par l'application peut la réinitialiser ; il ne repousse pas le maximum de 24 heures. Avec le choix prolongé, la connexion peut persister après fermeture du navigateur, jusqu'aux limites du fournisseur. La déconnexion explicite reste disponible.

Les paramètres `clientSessionIdleTimeout` et `clientSessionMaxLifespan` valent `0` pour hériter de la branche choisie. Aucun client du realm ne définit de surcharge `client.session.idle.timeout` ou `client.session.max.lifespan`. Des valeurs positives pourraient raccourcir la connexion et doivent être requalifiées avant ajout.

Les textes `localizationTexts` du realm remplacent seulement le message `rememberMe` dans les langues anglaise et française. Le formulaire, son étiquette native, sa navigation clavier et le thème de connexion restent ceux de Keycloak.

Cette politique traite les limites des sessions OIDC authentifiées : le maximum dépasse vingt heures, et le choix préalable multiplie l'inactivité ordinaire par 48. Le [test RGAA 13.1.4](https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/#13.1.4) accepte un mécanisme d'augmentation ou une limite d'au moins vingt heures. Pour [WCAG 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html), la plage d'ajustement doit atteindre dix fois le défaut et l'exception longue durée exige plus de vingt heures. La proposition initiale « maximum 10 heures, prolongation 20 heures » ne remplissait pas ces deux conditions WCAG.

La [documentation Keycloak 26.4.7](https://www.keycloak.org/docs/26.4.7/server_admin/index.html#_timeouts) distingue inactivité, maximum, sessions client et durée des jetons. Le choix prolongé ne demande aucun jeton `offline_access` et n'allonge pas les jetons d'accès.

## Application et vérification

Le fichier `realm-export.json` est importé au démarrage seulement si le realm n'existe pas encore. Le label `refapp.realm-revision` du service Keycloak est donc révisé avec cette politique. En développement, un prochain `docker compose up -d keycloak` recrée le conteneur et réimporte le realm ; le stockage Keycloak de cette composition n'est pas conservé hors du conteneur. Cette opération réinitialise les comptes et sessions locaux aux données du fichier d'import. Un simple redémarrage ne modifie pas un realm existant.

Pour un fournisseur avec stockage persistant, appliquer la politique avec son administration, puis vérifier les valeurs effectives et les surcharges de chaque client. Le fichier de développement ne configure pas automatiquement un SSO externe ou déployé.

Après import ou mise à jour :

1. Relever les durées effectives du realm et l'absence de plafonds client plus courts.
2. Vérifier que la case annonce « 24 heures », possède son étiquette et se coche/décoche avec Tabulation et Espace.
3. Ouvrir deux connexions indépendantes, ordinaire et prolongée. Relever les échéances émises par le fournisseur, les durées des refresh tokens et la persistance des cookies, sans conserver leurs valeurs secrètes.
4. Vérifier que les jetons d'accès durent toujours cinq minutes et que la déconnexion ferme la session.

Ces relevés prouvent la politique appliquée et les échéances annoncées. Ils ne doivent pas être présentés comme une attente réelle de vingt-quatre heures.

La régression de configuration est exécutée avec les tests unitaires frontend :

```sh
pnpm --dir frontend exec vitest run src/services/keycloak-session-policy.spec.ts
```
