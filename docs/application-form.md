# Formulaire d'application

`frontend/src/components/form/ApplicationForm.vue` orchestre la création en quatre
étapes et l'édition des informations générales. Les composants et composables
propres à ce formulaire se trouvent dans `components/form/application/`.

| Élément                                            | Responsabilité                                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `ApplicationMainStep.vue`                          | Nom, description, statut et informations principales.                                                         |
| `ApplicationDetailsStep.vue`                       | Priorité de redémarrage, populations, objectifs et tags.                                                      |
| `ApplicationMoaStep.vue`, `ApplicationMoeStep.vue` | Étapes des contacts ; les champs communs sont dans `ApplicationContactFields.vue`.                            |
| `application-form.validation.ts`                   | Schémas déclaratifs des quatre étapes et composable de validation.                                            |
| `use-application-form-state.ts`                    | Copie des données initiales, contacts, types d'acteurs et détection des saisies à confirmer avant annulation. |
| `use-application-form-actions.ts`                  | Enregistrement et synchronisation MAIA ; chargements via `withLoading`, erreurs via `backendErrorMessage`.    |

## Ajouter ou modifier une règle

Ajouter la règle dans le schéma de l'étape concernée. Chaque règle associe un
champ typé à une fonction renvoyant le message d'erreur, ou `undefined` si la
valeur est valide. L'ordre des règles suit l'ordre des champs affichés.

`validateStep` remplace uniquement les erreurs de l'étape courante ; `validateAll`
recalcule toutes les erreurs applicables. Les détails de l'étape 2 sont facultatifs.
En édition, seules les deux premières étapes sont affichées et validées. Les
contacts groupés requièrent une organisation et un email, sans prénom ni nom.

Le formulaire utilise `novalidate` pour présenter les mêmes erreurs accessibles
sur les boutons « Suivant » et à l'enregistrement. Chaque erreur est liée au
contrôle réel par `aria-describedby`, avec `aria-invalid`. Le parent ouvre
l'étape de la première erreur, puis appelle son `focusField`. La description
repasse en édition si son aperçu était ouvert. Après une navigation sans erreur,
le titre de l'étape reçoit le focus.

## État et appels réseau

Les tableaux et le statut initiaux sont copiés : une modification suivie d'une
annulation ne doit pas altérer les données du composant appelant. Les droits
`AppWrite` et `AppWritePriority` restent indépendants en édition.

La création conserve les trois requêtes existantes : application, acteur MOA,
puis acteur MOE. Chaque réponse HTTP est contrôlée. Si l'ajout d'un acteur échoue,
l'application existe déjà : le message le précise et aucun succès global n'est
émis. Ces appels ne constituent pas une transaction. Les boutons d'enregistrement
et de synchronisation sont protégés contre les appels simultanés. En édition,
l'événement `success` contient la réponse mise à jour.

## Vérification

Les tests Vitest placés à côté des composants couvrent les règles de chaque
étape, la navigation et le focus, les liens d'erreur sur les vrais contrôles DSFR,
les champs répétables, les permissions, l'annulation et les réponses API.
Ils sont inclus dans `pnpm --dir frontend test:unit:coverage`, exécuté par la CI.

Les parcours existants de création et d'édition sont conservés dans
`frontend/tests/createApplication.spec.ts` et `e2e/tests/actions-crud.spec.ts`.
Les scénarios `PRM-11` et `RGA-01` / `RGA-02` vérifient aussi les droits sur la
priorité de redémarrage et la navigation au clavier dans un vrai navigateur.
Ils nécessitent le backend, Keycloak et les jeux de données principal et QA.
