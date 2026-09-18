import { computed, onScopeDispose, ref, shallowRef } from "vue";
import type { TableSortEvent } from "@/types/table";

export interface ServerTablePage<T> {
  results: T[];
  total: number;
}

export interface ServerTableQuery {
  page: number;
  pageSize: number;
  sortBy: string | undefined;
  order: "asc" | "desc";
}

interface ServerPaginatedTableOptions<T> {
  fetchPage: (query: ServerTableQuery) => Promise<ServerTablePage<T> | undefined>;
  pageSize?: number;
  initialSortColumn?: string;
}

/** Pagination serveur à index zéro ; les filtres métier restent dans fetchPage. */
export function useServerPaginatedTable<T>({ fetchPage, pageSize = 15, initialSortColumn }: ServerPaginatedTableOptions<T>) {
  const data = shallowRef<ServerTablePage<T>>({ results: [], total: 0 });
  const currentPage = ref(0);
  const itemsPerPage = ref(pageSize);
  const firstIndex = computed(() => currentPage.value * itemsPerPage.value);
  const sortColumn = ref(initialSortColumn);
  const isSortDescending = ref(false);
  const isLoading = ref(false);
  const hasLoadedOnce = ref(false);
  const error = shallowRef<unknown>();
  const hasError = computed(() => error.value !== undefined);
  let latestRequest = 0;
  let disposed = false;

  async function refresh() {
    if (disposed) return;
    const request = ++latestRequest;
    isLoading.value = true;

    try {
      const page = await fetchPage({
        page: currentPage.value,
        pageSize: itemsPerPage.value,
        sortBy: sortColumn.value,
        order: isSortDescending.value ? "desc" : "asc",
      });

      // Un ancien filtre/page ne doit écraser ni les lignes ni l'état de la requête courante.
      if (request !== latestRequest || !page) return;
      data.value = page;
      hasLoadedOnce.value = true;
      error.value = undefined;
    } catch (cause) {
      if (request === latestRequest) error.value = cause ?? new Error("Erreur lors du chargement du tableau");
    } finally {
      if (request === latestRequest) isLoading.value = false;
    }
  }

  function resetAndFetch() {
    currentPage.value = 0;
    return refresh();
  }

  function onSort(event: TableSortEvent) {
    sortColumn.value = event.sortField || initialSortColumn;
    isSortDescending.value = event.sortOrder === -1;
    return resetAndFetch();
  }

  function onPage(event: { page: number; rows: number }) {
    currentPage.value = event.page;
    itemsPerPage.value = event.rows;
    return refresh();
  }

  // RGAA-084 (7.5) : conserver cette région live montée, y compris pendant le chargement.
  function statusMessage(label: string) {
    return computed(() => {
      if (isLoading.value) return `Chargement des ${label}…`;
      const { results, total } = data.value;
      if (total === 0) return "Aucune donnée ne correspond à votre recherche : Résultat 0 à 0";
      const from = results.length ? firstIndex.value + 1 : 0;
      const to = results.length ? Math.min(firstIndex.value + results.length, total) : 0;
      return `Résultat ${from} à ${to} sur ${total}`;
    });
  }

  onScopeDispose(() => {
    disposed = true;
    latestRequest++;
    isLoading.value = false;
  });

  return {
    data,
    currentPage,
    itemsPerPage,
    firstIndex,
    sortColumn,
    isSortDescending,
    isLoading,
    hasLoadedOnce,
    error,
    hasError,
    refresh,
    resetAndFetch,
    onSort,
    onPage,
    statusMessage,
  };
}
