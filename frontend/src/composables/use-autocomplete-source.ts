import type { Ref } from "vue";
import { computed, ref } from "vue";

export type SyncResults<T> = (options: T[]) => void;
export type SourceFn<T> = (query: string, syncResults: SyncResults<T>) => void;

export function normalizeSource<T>(source: SourceFn<T> | T[]): SourceFn<T> {
  if (Array.isArray(source)) {
    return (query, sync) => {
      const lowerQuery = (query || "").toLowerCase();
      sync(source.filter(row => String(row).toLowerCase().includes(lowerQuery)));
    };
  }
  return source;
}

export function useAutocompleteSource<T>(opts: {
  source: SourceFn<T> | T[]
  minLength: number
  showAllValues: boolean
}) {
  const sourceFn = normalizeSource<T>(opts.source);

  const suggestions = ref<T[]>([]);
  const isMenuOpen = ref(false);
  const selectedIndex = ref<number>(-1);
  const currentQuery = ref("");
  const isLoading = ref(false);

  let requestSequence = 0;

  const isQueryLongEnough = computed(() => currentQuery.value.length >= opts.minLength);
  const isQueryEmpty = computed(() => currentQuery.value.length === 0);

  function setQuery(newQuery: string) {
    currentQuery.value = newQuery;
  }

  function search(queryParam = currentQuery.value) {
    const canSearch = !isQueryEmpty.value && isQueryLongEnough.value;
    if (!canSearch && !opts.showAllValues) {
      isMenuOpen.value = false;
      suggestions.value = [];
      selectedIndex.value = -1;
      return;
    }

    const seq = ++requestSequence;
    isLoading.value = true;
    sourceFn(queryParam, (rows) => {
      if (seq !== requestSequence) return;
      isLoading.value = false;
      suggestions.value = rows;
      const hasAny = rows.length > 0;
      isMenuOpen.value = hasAny;
    });
  }

  function openAll() {
    if (!opts.showAllValues) return;
    const seq = ++requestSequence;
    isLoading.value = true;
    sourceFn("", (rows) => {
      if (seq !== requestSequence) return;
      isLoading.value = false;
      suggestions.value = rows;
      isMenuOpen.value = rows.length > 0;
      selectedIndex.value = rows.length ? 0 : -1;
    });
  }

  function close() {
    isMenuOpen.value = false;
    selectedIndex.value = -1;
  }

  function reset() {
    suggestions.value = [];
    close();
  }

  return {
    suggestions: suggestions as Ref<T[]>,
    isMenuOpen,
    selectedIndex,
    currentQuery,
    isLoading,
    isQueryLongEnough,
    isQueryEmpty,

    options: suggestions as unknown as Ref<any[]>,
    menuOpen: isMenuOpen,
    selected: selectedIndex,
    query: currentQuery,
    loading: isLoading,
    queryLongEnough: isQueryLongEnough,
    queryEmpty: isQueryEmpty,

    setQuery,
    search,
    openAll,
    close,
    reset,
  };
}
