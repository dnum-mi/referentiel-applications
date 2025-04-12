<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useSiteStore } from "@/stores/siteStore";
import { useDebouncedFn } from "@/composables/use-debouncefn";
import SuggestionsInput from "@/components/SuggestionsInput.vue";
import PriorityRestartFilter from "./PriorityRestartFilter.vue";

const searchStore = useApplicationSearchStore();
const siteStore = useSiteStore();

const selectedSiteId = ref("");

const { run: debouncedSearch } = useDebouncedFn(() => {
  searchStore.searchApplications();
}, 300);

onMounted(() => {
  siteStore.fetchAll();
});

watch(
  () => siteStore.sites,
  (sites) => {
    const currentSiteLabel = searchStore.filters.hostingSite;
    const match = sites.find((s) => s.label === currentSiteLabel);
    if (match) selectedSiteId.value = match.id;
  },
  { immediate: true },
);

function updateSite(id: string) {
  selectedSiteId.value = id;
  const selected = siteStore.sites.find((s) => s.id === id);
  searchStore.setFilter("hostingSite", selected?.label || "");
  debouncedSearch();
}

function clearSite() {
  selectedSiteId.value = "";
  searchStore.setFilter("hostingSite", "");
  debouncedSearch();
}
</script>

<template>
  <div class="filter-section">
    <h4>Hébergement</h4>

    <!-- 👉 On inclut ici PriorityRestartFilter -->
    <PriorityRestartFilter />

    <SuggestionsInput :returnData="selectedSiteId" @update:returnData="updateSite" :searchData="siteStore.sites" label="Site" />

    <div v-if="searchStore.filters.hostingSite" class="selected-tag">
      {{ searchStore.filters.hostingSite }}
      <span class="tag-remove" @click="clearSite">×</span>
    </div>
  </div>
</template>

<style scoped>
.filter-section {
  margin-bottom: 2rem;
}

.selected-tag {
  display: inline-flex;
  align-items: center;
  background: #e0edff;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #003366;
}

.tag-remove {
  cursor: pointer;
  margin-left: 0.5rem;
  font-weight: bold;
  color: #003366;
}

.tag-remove:hover {
  color: #d60000;
}
</style>
