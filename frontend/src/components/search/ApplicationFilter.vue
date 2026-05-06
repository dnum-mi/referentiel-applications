<script setup lang="ts">
import { useApplicationSearch } from "@/composables/use-application-search";

const { filters, setFilter } = useApplicationSearch();
</script>

<template>
  <div class="filter-section">
    <DsfrInput
      :model-value="filters.search"
      label-visible
      label="Nom de l'application"
      data-testid="application-filter-label"
      @update:model-value="setFilter({ search: $event?.toString(), page: 0 })"
    />
    <legend class="fr-label">Tags</legend>
    <TagSearchSelect :tags="filters.tag" data-testid="application-filter-tag" @update:tags="setFilter({ tag: $event, page: 0 })" />
    <DsfrInput
      :model-value="filters.link"
      label-visible
      label="Lien externe"
      data-testid="application-filter-link"
      @update:model-value="setFilter({ link: $event?.toString(), page: 0 })"
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
