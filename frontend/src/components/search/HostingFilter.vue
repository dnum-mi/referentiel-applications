<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useSiteStore } from "@/stores/siteStore";
import PriorityRestartFilter from "./PriorityRestartFilter.vue";
import { DsfrInput } from "@gouvminint/vue-dsfr";
import type { HostingOptionDto } from "@/client/types.gen.js";
import { useHostingStore } from "@/stores/hostingStore.js";

const searchStore = useApplicationSearchStore();
const siteStore = useSiteStore();
const hostingStore = useHostingStore();

const hostingSearchInput = ref(searchStore.filters.hostingSearch);
const allHostingOptions = ref<HostingOptionDto[]>([]);

function formatOptionText(option: HostingOptionDto): string {
  return [option.provider, option.platform, option.site, option.building || "", option.room || ""].filter(Boolean).join(" - ");
}

onMounted(async () => {
  siteStore.fetchAll();
  try {
    const hostingOptions = await hostingStore.getAllHostingOptions();
    allHostingOptions.value = hostingOptions;
  } catch (error) {
    console.error("Error fetching hosting options data:", error);
  }
});

watch(hostingSearchInput, (value?: string) => {
  searchStore.setFilter({ hostingSearch: value, page: 0 });
});

watch(
  searchStore.filters,
  () => {
    hostingSearchInput.value = searchStore.filters.hostingSearch;
  },
  { deep: true },
);
</script>

<template>
  <PriorityRestartFilter class="fr-mb-2w" data-testid="hosting-priority-restart-filter" />
  <DsfrInput
    v-model="hostingSearchInput"
    label-visible
    label="Hébergement"
    list="hostingSuggestionsList"
    placeholder="Rechercher site, plateforme, fournisseur, etc."
    data-testid="hosting-search-input"
  />
  <datalist id="hostingSuggestionsList" data-testid="hosting-suggestions-list">
    <option
      v-for="option in allHostingOptions"
      :key="`option-${option.site}-${option.platform}-${option.provider}`"
      :data-testid="`hosting-option-${option.site}-${option.platform}-${option.provider}`"
    >
      {{ formatOptionText(option) }}
    </option>
  </datalist>
</template>
