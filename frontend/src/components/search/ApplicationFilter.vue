<script setup lang="ts">
import { ref, watch } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useDebouncedFn } from "@/composables/use-debouncefn";

const searchStore = useApplicationSearchStore();

const label = ref(searchStore.filters.label);
const shortName = ref(searchStore.filters.shortName);
const tag = ref(searchStore.filters.tag);
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

watch(
  searchStore.filters,
  () => {
    label.value = searchStore.filters.label;
    shortName.value = searchStore.filters.shortName;
    tag.value = searchStore.filters.tag;
    link.value = searchStore.filters.link;
  },
  { deep: true },
);
</script>

<template>
  <div class="filter-section">
    <DsfrInput v-model="label" label-visible label="Nom de l'application" data-testid="application-filter-label" />
    <DsfrInput v-model="tag" label-visible label="Tag" data-testid="application-filter-tag" />
    <DsfrInput v-model="link" label-visible label="Lien externe" data-testid="application-filter-link" />
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
