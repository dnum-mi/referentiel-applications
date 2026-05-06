<script setup lang="ts">
import { useApplicationSearch } from "@/composables/use-application-search";

const { filters, setFilter } = useApplicationSearch();
</script>

<template>
  <div class="filter-section">
    <DsfrInput
      :model-value="filters.dataSourceName"
      label-visible
      label="Source de données"
      data-testid="application-filter-data-source-name"
      @update:model-value="setFilter({ dataSourceName: $event?.toString(), page: 0 })"
    />
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
