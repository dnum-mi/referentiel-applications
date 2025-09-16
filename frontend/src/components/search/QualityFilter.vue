<script setup lang="ts">
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";

const searchStore = useApplicationSearchStore();
const iqGte = computed(() => searchStore.filters.iqGte ?? 0);
const iqLte = computed(() => searchStore.filters.iqLte ?? 100);
</script>

<template>
  <DsfrRange
    v-model="iqLte"
    v-model:lower-value="iqGte"
    data-testid="quality-filter-range"
    label="Indice de qualité"
    @update:model-value="(val) => searchStore.setFilter({ iqLte: typeof val === 'number' ? val : Number.parseInt(val, 10) })"
    @update:lower-value="(val) => searchStore.setFilter({ iqGte: typeof val === 'number' ? val : Number.parseInt(val, 10) })"
  />
</template>
