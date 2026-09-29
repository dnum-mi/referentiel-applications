# ADR-010 — Porter la limitation de débit de l'APIM dans KrakenD

## Statut

Proposé

## Date

2026-09-28

## Participants

Contributeurs du ticket [#2293](https://github.com/dnum-mi/referentiel-applications/issues/2293) ; validation lors de la revue de la PR.

## Contexte et Problème

La dépendance `@nestjs/throttler` était déclarée sans `ThrottlerModule`, garde ni décorateur de limitation dans le backend. Sa présence n'activait donc aucune protection. Il faut expliciter la responsabilité de la limitation avant de retirer cette dépendance inutilisée.

Deux configurations ont été inspectées localement le 28 septembre 2026 :

- Le fichier [`krakend.json`](../../krakend.json) du dépôt applicatif ne contient aucune section de limitation de débit.
- Le fichier [`apim/values-krakend.yaml` du dépôt d'infrastructure, commit `7d6c6af3`](https://github.com/dnum-mi/referentiel-applications-infra/blob/7d6c6af3bab778d58d418ccfd4df675f03066cb6/apim/values-krakend.yaml#L96-L110) définit les templates `qos/ratelimit/router` et `qos/ratelimit/proxy`. Le premier déclare par défaut `max_rate: 10000`, `client_max_rate: 100` et `every: 1m`, avec la stratégie `header` et la clé `Authorization`. Le second déclare `max_rate: 500` et `every: 1m`. Les routes de recherche et les routes génériques `/apim/v2/{ressource}` et `/apim/v2/{ressource}/{id}` incluent ces templates. Les routes publiques déclarées utilisent la stratégie `ip` côté routeur.

Ces observations prouvent l'existence de règles dans les sources d'infrastructure. Elles ne prouvent ni leur rendu final, ni leur chargement dans un environnement, ni les seuils effectifs d'une instance déployée.

## Options Considérées

- Ajouter un limiteur NestJS : couvre les appels directs, mais nécessite une politique de clés, de seuils et de stockage, ainsi qu'une coordination avec les limites de la passerelle.
- Retirer la dépendance inactive et conserver la responsabilité des limites de l'APIM dans la configuration KrakenD existante.

## Décision

Retenir la seconde option pour ce nettoyage : retirer `@nestjs/throttler` et maintenir la politique de limitation des routes APIM dans le dépôt d'infrastructure. Ne pas introduire de nouveaux seuils applicatifs implicites à l'occasion d'une suppression de dépendances.

La portée de cette décision est le trafic qui traverse les routes KrakenD configurées. Un accès direct au backend ou une route absente de ces templates ne bénéficie pas de ces limites. Le backend ne fournit pas de limitation NestJS et le `krakend.json` applicatif ne constitue pas une configuration de référence protégée.

## Conséquences

Le retrait conserve le comportement applicatif existant et supprime une dépendance qui pouvait laisser croire à une protection active. Les changements de seuils et de couverture des routes APIM relèvent du dépôt d'infrastructure.

La qualification d'un environnement doit vérifier la configuration effectivement chargée, le chemin réseau emprunté et le refus des requêtes au-delà du seuil. Si des accès directs doivent être limités, une protection dédiée doit être définie et testée avant leur exposition ; cette ADR ne vaut pas preuve de protection de toutes les entrées du backend.

## Liens et Références

- [Ticket #2293](https://github.com/dnum-mi/referentiel-applications/issues/2293)
- [Configuration applicative KrakenD](../../krakend.json)
- [Configuration APIM versionnée et inspectée](https://github.com/dnum-mi/referentiel-applications-infra/blob/7d6c6af3bab778d58d418ccfd4df675f03066cb6/apim/values-krakend.yaml)
