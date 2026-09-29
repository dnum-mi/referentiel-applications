# Protocole de non-régression — Intégration MAIA (`MAI-`)

> Couvre les cas #1-4 de l'issue #1825 (annuaire MAIA). La stack tourne avec `MOCK_MAIA_SERVICE=true`
> (organisation mock « …SEINE-ET-MARNE… ») : les appels MAIA sont déterministes, sans dépendance
> réseau externe. Utilisateur par défaut : `admin` / `pass`.

| Couverture          | Automatisation                                                                                                                        |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------ |
| **MAI-01 à MAI-04** | E2E : `e2e/tests/maia.spec.ts` (POM strict + mock MAIA)                                                                               |
| **MAI-05**          | Tests du composant : `frontend/src/components/admin/UserActions.spec.ts` ; contrôle manuel à réaliser en qualification avec MAIA réel |

---

### MAI-01 — Première connexion : organisation MAIA assignée par défaut ✅

- **Datafeature** : compte Keycloak `support` (jamais provisionné en base).
- **Action** : se connecter pour la première fois en `support`.
- **Résultat attendu** : l'organisation de l'utilisateur est renseignée depuis MAIA (chemin contenant « SEINE-ET-MARNE »).

### MAI-02 — Import des informations d'un acteur depuis MAIA ✅

- **Datafeature** : une application existante ; un email d'utilisateur existant.
- **Action** : fiche application → onglet Acteurs → « Ajouter un acteur », saisir un email puis cliquer « Synchroniser depuis MAIA ».
- **Résultat attendu** : toast « Organisation synchronisée depuis MAIA » ; les champs nom/prénom de l'acteur sont pré-remplis.

### MAI-03 — Le champ email précède le champ organisation ✅

- **Action** : ouvrir le formulaire d'ajout d'acteur.
- **Résultat attendu** : le champ email est positionné au-dessus du champ organisation (ordre corrigé, cf. #1825).

### MAI-04 — Batch admin : synchroniser les acteurs avec MAIA ✅

- **Datafeature** : utilisateur `admin`.
- **Action** : administration → onglet « Batch de données » → cliquer « Synchroniser les acteurs MAIA ».
- **Résultat attendu** : toast « Batch MAIA lancé en tâche de fond » (traitement asynchrone déclenché). Ne pas spammer le bouton.

### MAI-05 — Suggestion MAIA dans « Modifier l'utilisateur »

- **Datafeature** : compte administrateur autorisé à modifier un utilisateur dont l'organisation est connue dans MAIA.
- **Action** : administration → utilisateurs → « Modifier ».
- **Résultat attendu** : après le chargement, la ligne « Organisation MAIA » affiche le chemin proposé. Le badge est « VALIDÉE » si l'organisation sélectionnée correspond à la suggestion, sinon « NON VALIDÉE ».
- **Indisponibilité temporaire** : si la recherche échoue, un message et le bouton « Réessayer la recherche MAIA » apparaissent. La modification de l'utilisateur reste possible. Réessayer ou fermer puis rouvrir la fenêtre déclenche une nouvelle recherche ; une réponse réussie réaffiche le chemin et son badge.
- **Absence de résultat** : une réponse MAIA sans organisation affiche « Aucune organisation trouvée dans MAIA pour cet utilisateur. », sans badge de validation.
- **Réponses tardives** : une réponse reçue après la fermeture d'une fenêtre ne doit pas remplacer la suggestion d'une nouvelle ouverture, y compris pour un autre utilisateur.
- **Limite de la preuve automatisée** : ces variantes utilisent des réponses simulées dans les tests du composant ; elles ne valident pas la disponibilité ni les données de l'annuaire réel en qualification.
