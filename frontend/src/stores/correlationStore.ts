import type { CorrelationSuggestionDto, CorrelationSuggestionStatus, RunCorrelationDetectionResultDto } from "@/client/types.gen";
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index";
import { useToasterStore } from "@/stores/toasterStore";

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

  /**
   * Accepte une suggestion : le back crée la relation is_correlated_with sur
   * les deux fiches (avec traçabilité) et passe la suggestion en ACCEPTED.
   */
  async function acceptSuggestion(id: string): Promise<CorrelationSuggestionDto | undefined> {
    const toaster = useToasterStore();
    try {
      const response = await api.correlationSuggestionControllerAccept({ path: { id } });
      // Un autre administrateur a pu revoir la suggestion entre l'affichage
      // et le clic : le dire plutôt que d'afficher une erreur générique.
      if (response.response.status === 409) {
        toaster.addErrorMessage("Cette suggestion vient d'être revue par ailleurs. La liste est rafraîchie.");
        return undefined;
      }
      if (response.response.status === 404) {
        toaster.addErrorMessage("Cette suggestion n'existe plus. La liste est rafraîchie.");
        return undefined;
      }
      if (!response.response.ok || !response.data) {
        throw new Error("Erreur lors de l'acceptation de la suggestion");
      }
      toaster.addSuccessMessage("Suggestion acceptée : la relation de corrélation est visible sur les deux fiches.");
      return response.data;
    } catch {
      toaster.addErrorMessage("Erreur lors de l'acceptation de la suggestion.");
      return undefined;
    }
  }

  /** Rejette une suggestion : aucune relation créée, la paire ne sera plus re-proposée. */
  async function rejectSuggestion(id: string): Promise<CorrelationSuggestionDto | undefined> {
    const toaster = useToasterStore();
    try {
      const response = await api.correlationSuggestionControllerReject({ path: { id } });
      if (response.response.status === 409) {
        toaster.addErrorMessage("Cette suggestion vient d'être revue par ailleurs. La liste est rafraîchie.");
        return undefined;
      }
      if (response.response.status === 404) {
        toaster.addErrorMessage("Cette suggestion n'existe plus. La liste est rafraîchie.");
        return undefined;
      }
      if (!response.response.ok || !response.data) {
        throw new Error("Erreur lors du rejet de la suggestion");
      }
      toaster.addSuccessMessage("Suggestion rejetée : cette paire ne sera plus proposée.");
      return response.data;
    } catch {
      toaster.addErrorMessage("Erreur lors du rejet de la suggestion.");
      return undefined;
    }
  }

  const isDetectionRunning = ref(false);

  /** Déclenche manuellement le moteur de détection (409 si un run est déjà en cours). */
  async function runDetection(): Promise<RunCorrelationDetectionResultDto | undefined> {
    const toaster = useToasterStore();
    isDetectionRunning.value = true;
    try {
      const response = await api.correlationSuggestionControllerRun();
      if (response.response.status === 409) {
        toaster.addErrorMessage("Une détection est déjà en cours, réessayez dans un instant.");
        return undefined;
      }
      if (!response.response.ok || !response.data) {
        throw new Error("Erreur lors du lancement de la détection");
      }
      const { createdCount, updatedCount } = response.data;
      toaster.addSuccessMessage(`Détection terminée : ${createdCount} nouvelle(s) suggestion(s), ${updatedCount} rafraîchie(s).`);
      return response.data;
    } catch {
      toaster.addErrorMessage("Erreur lors du lancement de la détection.");
      return undefined;
    } finally {
      isDetectionRunning.value = false;
    }
  }

  return {
    suggestions,
    total,
    isLoading,
    isDetectionRunning,
    fetchSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    runDetection,
  };
});
