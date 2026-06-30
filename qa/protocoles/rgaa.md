# Protocole de non-régression — Accessibilité RGAA (`RGA-`)

> Critères RGAA couverts par ce domaine : **7.1** (titre de page annoncé), **11.1** (étiquette des
> champs), **12.8** (focus après navigation SPA), **12.9** (absence de piège clavier). Le formulaire
> de création d'application vierge et le chrome global suffisent ; aucun provisionnement de données
> requis. Session par défaut : `admin` / `pass`.

| Légende           |                                           |
| :---------------- | :---------------------------------------- |
| **Automatisé** ✅ | `e2e/tests/rgaa.spec.ts`                  |
| **Statut**        | ✅ 100 % des cas automatisés (POM strict) |

---

### RGA-01 — Tab sans sélection — pas de piège clavier (textarea) ✅

- **Datafeature** : aucune (formulaire de création vierge, session `admin`).
- **Action** : connecté, ouvrir le formulaire de création d'application, mettre le focus dans le textarea Description et appuyer sur Tab sans saisir de texte.
- **Résultat attendu** : le focus quitte le textarea et se déplace vers l'élément suivant (pas de piège clavier, RGAA 12.9).

### RGA-02 — Attribut title visible sur le textarea (étiquette) ✅

- **Datafeature** : aucune (formulaire de création vierge, session `admin`).
- **Action** : connecté, ouvrir le formulaire de création d'application et inspecter l'attribut `title` du textarea Description.
- **Résultat attendu** : l'attribut `title` du textarea est égal à « Description » (étiquette explicite, RGAA 11.1).

### RGA-03 — Focus sur l'annonceur de titre après navigation SPA ✅

- **Datafeature** : aucune (chrome global, session `admin`).
- **Action** : connecté depuis la page d'accueil, déclencher une navigation SPA via la navigation principale (ex. vers Recherche d'applications).
- **Résultat attendu** : le composant `page-title-announcer` reçoit le focus programmatique après la navigation (RGAA 12.8).

### RGA-04 — Contenu de l'annonceur = titre de la nouvelle page ✅

- **Datafeature** : aucune (chrome global, session `admin`).
- **Action** : connecté depuis la page d'accueil, naviguer via la navigation principale vers Recherche d'applications.
- **Résultat attendu** : le texte de l'annonceur correspond au titre de la page cible (« Recherche d'applications », RGAA 7.1).
