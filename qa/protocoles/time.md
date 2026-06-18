# Protocole de non-régression — Diagramme Time (`TIM-`)

> Page `/time` (`TimePage`) : nuage de points D3 de maturité TIME (dette technique), avec la sidebar
> de filtres partagée du catalogue. Dataviz : on valide la **présence du graphique (SVG) ou de l'état
> vide**, jamais le rendu interne D3. Utilisateur par défaut : `admin` / `pass`.

| Légende           |                                           |
| :---------------- | :---------------------------------------- |
| **Automatisé** ✅ | `e2e/tests/time.spec.ts`                  |
| **Statut**        | ✅ 100 % des cas automatisés (POM strict) |

---

### TIM-01 — La page Diagramme Time se charge ✅

- **Datafeature** : aucune (session `admin`).
- **Action** : ouvrir `/time`.
- **Résultat attendu** : le titre « Diagramme Time » et la section du graphique sont visibles.

### TIM-02 — Le nuage de points ou l'état vide s'affiche ✅

- **Datafeature** : aucune (session `admin`).
- **Action** : ouvrir `/time` et attendre la fin du chargement.
- **Résultat attendu** : le graphique SVG de maturité TIME s'affiche, ou l'état vide « Aucune donnée
  TIME disponible » si l'utilisateur n'a pas de données autorisées.

### TIM-03 — La sidebar de filtres est présente ✅

- **Datafeature** : aucune (session `admin`).
- **Action** : ouvrir `/time`.
- **Résultat attendu** : la sidebar de filtres (composant partagé du catalogue) est visible.

### TIM-04 — Filtrer par Qualité recharge le diagramme et reflète iqGte/iqLte ✅

- **Datafeature** : aucune (propagation URL + rechargement).
- **Action** : depuis la sidebar, régler une borne de Qualité (IQ min/max).
- **Résultat attendu** : l'URL porte `iqGte`/`iqLte` ; le diagramme se recharge et reste affiché
  (graphique ou état vide), sans erreur.
