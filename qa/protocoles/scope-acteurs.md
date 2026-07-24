# Protocole de non-régression — Périmètres admin & groupes d'acteurs (`SCP-`)

> Couvre les cas #12-17 de l'issue #1825. Fixtures déterministes fournies par le seed QA
> (`pnpm db:seed:qa`) : organisations hiérarchiques `TOTO` / `TOTO/TUTU` / `ABCD`, comptes Keycloak
> scopés (`scope-admin`, `member-toto-tutu`, `member-toto`, mot de passe `pass`), applications
> `QA-SCOPE-*` et `QA-GROUP-*`. Signal « est admin / est acteur » sur une application = bouton
> d'édition des informations actif.

| Légende           |                                                      |
| :---------------- | :--------------------------------------------------- |
| **Automatisé** ✅ | `e2e/tests/scope-acteurs.spec.ts`                    |
| **Statut**        | ✅ 100 % des cas automatisés (POM strict + seed QA). |

---

### SCP-01 — Admin scopé `TOTO/` est admin sur une app à acteur `TOTO/*` ✅

- **Datafeature** : compte `scope-admin` (périmètre `TOTO/`), application `QA-SCOPE-TOTO` (acteur d'org `TOTO/TUTU`).
- **Action** : se connecter en `scope-admin`, ouvrir la fiche de `QA-SCOPE-TOTO`, onglet Informations.
- **Résultat attendu** : le bouton d'édition des informations est actif (droits d'admin sur cette application).

### SCP-02 — Admin scopé `TOTO/` n'est PAS admin sur une app à acteur `ABCD/*` ✅

- **Datafeature** : compte `scope-admin`, application `QA-SCOPE-ABCD` (acteur d'org `ABCD`).
- **Action** : se connecter en `scope-admin`, ouvrir la fiche de `QA-SCOPE-ABCD`, onglet Informations.
- **Résultat attendu** : le bouton d'édition des informations est désactivé (hors périmètre).

### SCP-03 — Éditer le rôle d'un utilisateur dans mon périmètre ✅

- **Datafeature** : `scope-admin` (périmètre `TOTO/`), utilisateur cible `qa-target` (org `TOTO/TUTU`).
- **Action** : en `scope-admin`, panneau d'administration, éditer `qa-target`, changer son niveau de privilège et enregistrer.
- **Résultat attendu** : toast de succès — le périmètre autorise l'édition d'un utilisateur de l'arborescence `TOTO/`.

### SCP-04 — Édition dans le périmètre autorisée, édition hors périmètre refusée ✅

- **Datafeature** : `scope-admin`, `qa-target` (org `TOTO/TUTU`, dans le périmètre), `qa-outside` (org `ABCD`, hors périmètre).
- **Action** : en `scope-admin`, ouvrir le **modal d'édition** de `qa-target`, rechercher « TOTO » dans le champ
  organisation, sélectionner `TOTO` (≠ organisation du seed : l'assertion ne peut pas être vraie d'avance),
  enregistrer, puis restaurer `TOTO/TUTU` ; tenter d'éditer `qa-outside` via l'API — c'est le **garde-fou
  serveur** qu'on verrouille (la liste des utilisateurs n'est pas filtrée par périmètre, le trajet UI existe
  mais aboutit au même contrôle serveur).
- **Résultat attendu** : la saisie n'est pas interrompue et le **modal reste ouvert** pendant recherche + sélection
  (non-régression #1830 : plus de fermeture au rafraîchissement de la liste, ni de vol de focus après le focus
  initial différé de DsfrModal) ; toast de succès et organisation mise à jour (vérifiée via l'API) ; l'édition
  de `qa-outside` est refusée par le contrôle de périmètre.

### SCP-05 — Un membre de `TOTO/TUTU` est acteur via un groupe `TOTO/` ✅

- **Datafeature** : compte `member-toto-tutu` (org `TOTO/TUTU`), application `QA-GROUP-PARENT` (groupe d'acteur d'org `TOTO`).
- **Action** : se connecter en `member-toto-tutu`, ouvrir la fiche de `QA-GROUP-PARENT`, onglet Informations.
- **Résultat attendu** : le bouton d'édition est actif — le membre hérite des droits du groupe d'acteur parent.

### SCP-06 — Un membre de `TOTO` n'est PAS acteur via un groupe `TOTO/TUTU` ✅

- **Datafeature** : compte `member-toto` (org `TOTO`), application `QA-GROUP-CHILD` (groupe d'acteur d'org `TOTO/TUTU`).
- **Action** : se connecter en `member-toto`, ouvrir la fiche de `QA-GROUP-CHILD`, onglet Informations.
- **Résultat attendu** : le bouton d'édition est désactivé — un groupe d'acteur enfant ne confère pas de droits au parent.
