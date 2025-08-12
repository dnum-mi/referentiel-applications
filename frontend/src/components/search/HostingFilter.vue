<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useSiteStore } from "@/stores/siteStore";
import { useDebouncedFn } from "@/composables/use-debouncefn";
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

const { run: debouncedSearch } = useDebouncedFn(() => {
  searchStore.searchApplications();
}, 300);

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
  searchStore.setFilter("hostingSearch", value);
  searchStore.setFilter("page", 0);
  debouncedSearch();
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
  <div>
    <PriorityRestartFilter class="fr-mb-2w" />
    <DsfrInput
      v-model="hostingSearchInput"
      label-visible
      label="Hébergement"
      list="hostingSuggestionsList"
      placeholder="Rechercher site, plateforme, fournisseur, etc."
    />
    <datalist id="hostingSuggestionsList">
      <option v-for="option in allHostingOptions" :key="`option-${option.site}-${option.platform}-${option.provider}`">
        {{ formatOptionText(option) }}
      </option>
    </datalist>
  </div>
</template>
