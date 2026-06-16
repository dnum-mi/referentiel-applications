<script setup lang="ts">
import { ref, watch } from "vue";
import { useApplicationSearch } from "@/composables/use-application-search";

const { filters, setFilter } = useApplicationSearch();

const query = ref(filters.value.q ?? "");

// Garde le champ synchronisé si `q` change ailleurs (navigation via l'URL,
// réinitialisation des filtres).
watch(
  () => filters.value.q,
  (value) => {
    const next = value ?? "";
    if (next !== query.value) query.value = next;
  },
);

function applySearch(value?: string | number) {
  const q = value?.toString().trim() || undefined;
  setFilter({
    q,
    page: 0,
    // Tri par pertinence dès qu'une recherche full-text est active ; retour au
    // tri par défaut (libellé) lorsque le champ est vidé.
    sortBy: q ? "relevance" : "label",
  });
}
</script>

<template>
  <div class="fulltext-search" data-testid="application-fulltext-search-wrapper">
    <DsfrSearchBar
      v-model.trim="query"
      label="Recherche d'applications"
      placeholder="Rechercher dans toutes les informations des fiches (description, finalités, tags, acteurs…)"
      button-text="Rechercher"
      data-testid="application-fulltext-search"
      @search="applySearch"
      @update:model-value="applySearch"
    />
  </div>
</template>

<style scoped>
.fulltext-search {
  margin: 0.5rem 0 1.25rem;
  max-width: 48rem;
}
</style>
