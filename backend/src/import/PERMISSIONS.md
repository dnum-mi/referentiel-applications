# Import Excel — droits et permissions (US #1890)

L'endpoint `POST /import/excel` est réservé aux administrateurs (permission **globale**
`AdminPanelManage`). Mais cela ne suffit pas : RefApp distingue deux familles de permissions et les
opérations d'écriture sur les données métier sont des **permissions applicatives**, calculées **par
application** (la portée / _scope_ de l'utilisateur est prise en compte). Voir
`src/permissions/role-to-permissions.ts` (`roleToPermissions` vs `roleToAppPermissions`) et
`src/common/service/check-permissions.service.ts`.

## Politique

L'import applique, **ligne par ligne**, exactement les **mêmes permissions et la même portée** que
l'API correspondante (via `CheckPermissions.can(permission, requestor, applicationId)`). Conséquences :

- un **administrateur global** (rôle `ADMIN` sans `scopeOrganization`) peut tout importer ;
- un **administrateur scopé** (rôle `ADMIN` avec une `scopeOrganization`) ne peut créer/modifier que
  les données des applications **de son périmètre** ; les lignes hors périmètre sont **refusées** ;
- toute ligne refusée est **consignée dans le rapport d'exécution** avec un motif explicite
  (`Droits insuffisants : permission « … » requise [sur l'application …].`) et le traitement
  **continue** avec les lignes suivantes.

## Matrice « qui a le droit de faire quoi »

| Onglet           | Opération              | Permission requise  | Type        | Portée                                  |
| :--------------- | :--------------------- | :------------------ | :---------- | :-------------------------------------- |
| **Applications** | création (sans id)     | `CreateApplication` | globale     | —                                       |
| **Applications** | mise à jour (id)       | `AppWrite`          | applicative | sur l'application ciblée (scope inclus) |
| **Hébergements** | création / mise à jour | `HostingWrite`      | applicative | sur l'application de rattachement       |
| **Acteurs**      | création / mise à jour | `ActorWrite`        | applicative | sur l'application de rattachement       |
| **Conformités**  | création / mise à jour | `ComplianceWrite`   | applicative | sur l'application de rattachement       |

> Note `priorityRestart` (Applications) : la protection fine du champ priorité de redémarrage
> (`AppWritePriority`) reste assurée par `ApplicationService.update`. Le contrôle `AppWrite` effectué
> en amont par le processeur renseigne `requestor.appPerms` pour l'application ciblée, ce dont
> dépend cette protection.

## Où c'est implémenté

- Contrôle par ligne : dans chaque processeur `src/import/processors/*-sheet.processor.ts`
  (`checkPermissions.can([...], requestor, applicationId)` avant l'appel au service métier).
- Message de refus : `insufficientRightsMessage()` dans `src/import/utils/excel.utils.ts`.
- Le `Requestor` complet (permissions de rôle + `additionalPermissions` + portée) circule depuis le
  contrôleur (`@User()`) jusqu'aux processeurs.

## Tests

- **Unitaires** : pour chaque processeur, un cas « refus de droits » vérifie qu'une ligne est
  consignée en erreur avec le motif attendu et que le service métier n'est **pas** appelé
  (`*-sheet.processor.spec.ts`).
- **e2e (non-régression)** : un administrateur scopé importe une donnée hors de son périmètre et
  obtient un rapport « en erreur » avec le motif « Droits insuffisants » (cf. protocole QA).
