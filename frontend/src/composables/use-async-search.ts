import { onScopeDispose, ref, shallowRef } from "vue";
import { MIN_CHAR_FOR_SEARCH } from "@/constants/min-char-for-search";

interface AsyncSearchOptions {
  minLength?: number;
  errorMessage?: string;
}

/** État isolé par champ ; seule la dernière requête peut publier son résultat. */
export function useAsyncSearch<T>(search: (query: string) => Promise<T[]>, options: AsyncSearchOptions = {}) {
  const { minLength = MIN_CHAR_FOR_SEARCH, errorMessage = "Erreur lors de la recherche." } = options;
  const results = shallowRef<T[]>([]);
  const isLoading = ref(false);
  const error = ref("");
  const hasSearched = ref(false);
  let latestRequestId = 0;
  let disposed = false;

  // Invalider dès la saisie, avant l'éventuel délai de debounce du composant.
  // Des résultats initiaux peuvent être conservés pour une sélection déjà résolue.
  function reset(initialResults: T[] = []) {
    latestRequestId++;
    results.value = initialResults;
    error.value = "";
    isLoading.value = false;
    hasSearched.value = false;
  }

  async function onQuery(query: string) {
    reset();
    if (disposed || !query || query.length < minLength) return [];

    const requestId = latestRequestId;
    isLoading.value = true;
    try {
      const response = await search(query);
      if (requestId !== latestRequestId) return [];
      results.value = response;
      return response;
    } catch {
      if (requestId === latestRequestId) error.value = errorMessage;
      return [];
    } finally {
      if (requestId === latestRequestId) {
        isLoading.value = false;
        hasSearched.value = true;
      }
    }
  }

  onScopeDispose(() => {
    disposed = true;
    reset();
  }, true);

  return { results, isLoading, error, hasSearched, onQuery, reset };
}
