# Protocole de non-régression — Intégration MAIA (`MAI-`)

> Couvre les cas #1-4 de l'issue #1825 (annuaire MAIA). La stack tourne avec `MOCK_MAIA_SERVICE=true`
> (organisation mock « …SEINE-ET-MARNE… ») : les appels MAIA sont déterministes, sans dépendance
> réseau externe. Utilisateur par défaut : `admin` / `pass`.

| Légende           |                                                       |
| :---------------- | :---------------------------------------------------- |
| **Automatisé** ✅ | `e2e/tests/maia.spec.ts`                              |
| **Statut**        | ✅ 100 % des cas automatisés (POM strict + mock MAIA) |

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
