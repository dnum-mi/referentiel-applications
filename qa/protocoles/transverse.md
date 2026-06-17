# Protocole de non-régression — Pages transverses (`TRV-`)

> Pages utilitaires & transverses : plan du site (`/plan-du-site`), accessibilité (`/accessibilite`)
> et page « 404 » (route inconnue). Cas légers de non-régression de la navigation. Utilisateur par
> défaut connecté : `admin` / `pass`.

| Légende           |                                           |
| :---------------- | :---------------------------------------- |
| **Automatisé** ✅ | `e2e/tests/transverse.spec.ts`            |
| **Statut**        | ✅ 100 % des cas automatisés (POM strict) |

---

### TRV-01 — Le plan du site se charge ✅

- **Datafeature** : aucune (session vierge).
- **Action** : ouvrir `/plan-du-site`.
- **Résultat attendu** : le titre « Plan du site » est visible et au moins un lien public est listé.

### TRV-02 — Un lien public du plan du site navigue vers sa page ✅

- **Datafeature** : aucune (session vierge).
- **Action** : sur le plan du site, cliquer le lien « Accessibilité » de la liste publique.
- **Résultat attendu** : navigation vers `/accessibilite`.

### TRV-03 — Le plan du site connecté liste l'espace connecté ✅

- **Datafeature** : session `admin`.
- **Action** : ouvrir `/plan-du-site` connecté.
- **Résultat attendu** : la section « Espace connecté » et ses liens protégés sont présents.

### TRV-04 — La page Accessibilité se charge ✅

- **Datafeature** : aucune (session vierge).
- **Action** : ouvrir `/accessibilite`.
- **Résultat attendu** : le titre « Accessibilité » est visible.

### TRV-05 — Une route inconnue affiche la page « non trouvée » ✅

- **Datafeature** : aucune (session vierge).
- **Action** : ouvrir une URL inexistante.
- **Résultat attendu** : la page « 404 » s'affiche (texte « 404 » / « introuvable »).

### TRV-06 — La page 404 ramène au catalogue (connecté) ✅

- **Datafeature** : session `admin`.
- **Action** : sur la page 404, cliquer « Retour à l'accueil ».
- **Résultat attendu** : navigation vers `/recherche-application`.
