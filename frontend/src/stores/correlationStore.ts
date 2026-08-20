import type { CorrelationSuggestionDto, CorrelationSuggestionStatus } from "@/client/types.gen";
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index";

export interface FetchSuggestionsQuery {
  status?: CorrelationSuggestionStatus;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  order?: "asc" | "desc";
}

/**
 * Suggestions de corrélation entre applications (#2281), pour l'écran de revue
 * du panel admin. Consomme l'API correlation-suggestions du client généré.
 */
export const useCorrelationStore = defineStore("correlationStore", () => {
  const suggestions = ref<CorrelationSuggestionDto[]>([]);
  const total = ref(0);
  const isLoading = ref(false);

  async function fetchSuggestions(query: FetchSuggestionsQuery = {}) {
    isLoading.value = true;
    try {
      const response = await api.correlationSuggestionControllerFindAll({ query });
      if (response.data) {
        suggestions.value = response.data.results;
        total.value = response.data.total;
      }
    } finally {
      isLoading.value = false;
    }
  }

  return {
    suggestions,
    total,
    isLoading,
    fetchSuggestions,
  };
});
