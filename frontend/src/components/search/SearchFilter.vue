<script setup lang="ts">
import { computed } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";

const searchStore = useApplicationSearchStore();

const search = computed(() => searchStore.filters.search);

function updateSearch(val: string) {
  searchStore.setFilter({ search: val, page: 0 });
}
</script>

<template>
  <DsfrInput
    v-model="search"
    :label-visible="false"
    placeholder="Nom ou label"
    label="Nom de l'application"
    data-testid="application-filter-label"
    @update:model-value="updateSearch"
  />
</template>
