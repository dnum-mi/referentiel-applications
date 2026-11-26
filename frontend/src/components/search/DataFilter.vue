<script setup lang="ts">
import { useApplicationSearch } from "@/composables/use-application-search";

const { filters, setFilter } = useApplicationSearch();
</script>

<template>
  <div class="filter-section">
    <FilterWithHelp>
      <DsfrInput
        :model-value="filters.dataSourceName"
        label-visible
        description-id="data-source-name-tooltip-desc"
        data-testid="application-filter-data-source-name"
        @update:model-value="setFilter({ dataSourceName: $event?.toString(), page: 0 })"
      >
        <template #label>Source de données</template>
      </DsfrInput>
      <template #help>
        <DsfrTooltip
          aria-label="Afficher l’aide sur le filtre Source de données"
          id="data-source-name-tooltip-desc"
          content="Recherche les applications utilisant une donnée dont le nom contient le texte saisi."
        />
      </template>
    </FilterWithHelp>
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
