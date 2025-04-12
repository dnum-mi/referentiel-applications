<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useDebouncedFn } from "@/composables/use-debouncefn";

const searchStore = useApplicationSearchStore();

const label = ref(searchStore.filters.label);
const shortName = ref(searchStore.filters.shortName);
const tag = ref(searchStore.filters.tag);
const priorityRestart = ref(searchStore.filters.priorityRestart);
const link = ref(searchStore.filters.link);

const { run: debouncedSearch } = useDebouncedFn(() => {
  searchStore.searchApplications();
}, 300);

watch(label, (val) => {
  searchStore.setFilter("label", val);
  searchStore.setFilter("page", 0);
  debouncedSearch();
});

watch(shortName, (val) => {
  searchStore.setFilter("shortName", val);
  searchStore.setFilter("page", 0);
  debouncedSearch();
});

watch(tag, (val) => {
  searchStore.setFilter("tag", val);
  searchStore.setFilter("page", 0);
  debouncedSearch();
});

watch(link, (val) => {
  searchStore.setFilter("link", val);
  searchStore.setFilter("page", 0);
  debouncedSearch();
});
</script>

<template>
  <div class="filter-section">
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
