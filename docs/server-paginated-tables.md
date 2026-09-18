# Tableaux d'administration paginés côté serveur

Les onglets utilisateurs, tags, sources de noms alternatifs, directions métier,
organisations et acteurs partagent `useServerPaginatedTable`.

```ts
const search = ref("");
const table = useServerPaginatedTable<TagDto>({
  pageSize: 15, // valeur par défaut
  fetchPage: async (pagination) => {
    const response = await api.tagsControllerFindAll({
      query: { ...pagination, name: search.value || undefined },
    });
    return response.data;
  },
});
const status = table.statusMessage("tags");

onMounted(table.refresh);
watchDebounced(search, table.resetAndFetch, { debounce: 300 });
```

- `fetchPage` reçoit `{ page, pageSize, sortBy, order }` et retourne
  `{ results, total }` ou `undefined` si l'API ne fournit pas de données.
  Les filtres métier et les appels aux API restent dans chaque onglet.
- `currentPage` commence à **0** ; `itemsPerPage` et `firstIndex` alimentent
  respectivement `rows` et `first` de `RefAppTable`.
- `initialSortColumn` est facultatif. `sortColumn` et `isSortDescending`
  exposent le tri. Brancher `onSort` et `onPage` aux événements correspondants :
  chaque événement lance une requête, le tri repart en première page.
- `refresh()` recharge la page courante après une édition ; `resetAndFetch()`
  revient en première page après un changement de filtre, en conservant le tri.
  Le composable ne lance aucun chargement automatiquement.
- Seule la requête la plus récente peut modifier `data`, `error`,
  `hasLoadedOnce` et `isLoading`. Les réponses après démontage sont ignorées.
  Les erreurs levées par `fetchPage` sont capturées (`error`, `hasError`) et
  les dernières lignes restent disponibles ; une réussite efface l'erreur.
- `statusMessage(label)` retourne une valeur calculée pour le chargement, le
  résultat vide et la plage de résultats (RGAA-084). Afficher cette valeur dans
  une région `aria-live="polite" aria-atomic="true"` qui reste montée pendant
  les chargements. Les utilisateurs gardent également leur table montée après
  le premier succès pour préserver les fenêtres d'édition ouvertes (#1830).
