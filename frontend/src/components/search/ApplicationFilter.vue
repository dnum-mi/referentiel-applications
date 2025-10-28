<script setup lang="ts">
import { ref, watch } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";

const searchStore = useApplicationSearchStore();

const label = toRef(searchStore.filters.label);
const shortName = ref(searchStore.filters.shortName);
const tag = ref(searchStore.filters.tag);
const link = ref(searchStore.filters.link);

watch(label, (val) => {
  searchStore.setFilter({ label: val, page: 0 });
});

watch(shortName, (val) => {
  searchStore.setFilter({ shortName: val, page: 0 });
});

watch(tag, (val) => {
  searchStore.setFilter({ tag: val, page: 0 });
});

watch(link, (val) => {
  searchStore.setFilter({ link: val, page: 0 });
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
    <DsfrInput v-model="searchStore.filters.label" label-visible label="Nom de l'application" data-testid="application-filter-label" />
    <legend class="fr-label"> Tags </legend>
    <TagSearchSelect v-model:tags="searchStore.filters.tag" data-testid="application-filter-tag" />
    <DsfrInput v-model="searchStore.filters.link" label-visible label="Lien externe" data-testid="application-filter-link" />
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
