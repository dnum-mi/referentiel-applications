<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useSiteStore } from "@/stores/siteStore";
import { useDebouncedFn } from "@/composables/use-debouncefn";
import PriorityRestartFilter from "./PriorityRestartFilter.vue";
import HostingOptions from "@/api/hosting-options";
import { DsfrInput } from "@gouvminint/vue-dsfr";

const searchStore = useApplicationSearchStore();
const siteStore = useSiteStore();

const hostingSearchInput = ref(searchStore.filters.hostingSearch || "");
const allHostingOptions = ref<{ site: string; platform: string; provider: string; building?: string; room?: string }[]>([]);

const { run: debouncedSearch } = useDebouncedFn(() => {
  searchStore.searchApplications();
}, 300);

onMounted(async () => {
  siteStore.fetchAll();
  try {
    const hostingOptions = await HostingOptions.getAll();
    allHostingOptions.value = hostingOptions;
  } catch (error) {
    console.error("Error fetching hosting options data:", error);
  }
});

watch(hostingSearchInput, (value) => {
  searchStore.setFilter("hostingSearch", value);
  searchStore.setFilter("page", 0);
  debouncedSearch();
});
</script>

<template>
  <div>
    <PriorityRestartFilter class="fr-mb-2w" />
    <DsfrInput
      label-visible
      label="Hébergement"
      v-model="hostingSearchInput"
      list="hostingSuggestionsList"
      placeholder="Rechercher site, plateforme, fournisseur, etc."
    />
    <datalist id="hostingSuggestionsList">
      <option v-for="option in allHostingOptions" :key="option.id" :value="option.site"></option>
      <option v-for="option in allHostingOptions" :key="option.id + '-platform'" :value="option.platform"></option>
      <option v-for="option in allHostingOptions" :key="option.id + '-provider'" :value="option.provider"></option>
      <option
        v-for="option in allHostingOptions.filter((o) => o.building)"
        :key="option.id + '-building'"
        :value="option.building"
      ></option>
      <option v-for="option in allHostingOptions.filter((o) => o.room)" :key="option.id + '-room'" :value="option.room"></option>
    </datalist>
  </div>
</template>
