<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useDebouncedFn } from "@/composables/use-debouncefn";

const searchStore = useApplicationSearchStore();

// Champs locaux
const label = ref(searchStore.filters.label);
const shortName = ref(searchStore.filters.shortName);
const tag = ref(searchStore.filters.tag);
const priorityRestart = ref(searchStore.filters.priorityRestart);
const link = ref(searchStore.filters.link);

// Debounce commun
const { run: debouncedSearch } = useDebouncedFn(() => {
  searchStore.searchApplications();
}, 300);

// Watchers debouncés
watch(label, (val) => {
  searchStore.setFilter("label", val);
  debouncedSearch();
});

watch(shortName, (val) => {
  searchStore.setFilter("shortName", val);
  debouncedSearch();
});

watch(tag, (val) => {
  searchStore.setFilter("tag", val);
  debouncedSearch();
});

watch(priorityRestart, (val) => {
  searchStore.setFilter("priorityRestart", val);
  debouncedSearch();
});

watch(link, (val) => {
  searchStore.setFilter("link", val);
  debouncedSearch();
});
</script>

<template>
  <div class="filter-section">
    <h4>Application</h4>

    <DsfrInput label-visible label="Nom de l'application" v-model="label" />
    <DsfrInput label-visible label="Nom court" v-model="shortName" />
    <DsfrInput label-visible label="Tag" v-model="tag" />
    <DsfrInput label-visible label="Lien externe" v-model="link" />
  </div>
</template>

<style scoped>
.filter-section {
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
