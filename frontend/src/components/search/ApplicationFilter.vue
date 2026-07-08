<script setup lang="ts">
import { useApplicationSearch } from "@/composables/use-application-search";

const { filters, setFilter } = useApplicationSearch();
</script>

<template>
  <div class="filter-section">
    <DsfrInput
      :model-value="filters.search"
      label-visible
      aria-describedby="search-tooltip-desc"
      data-testid="application-filter-label"
      @update:model-value="setFilter({ search: $event?.toString(), page: 0 })"
    >
      <template #label>
        <span style="display: inline-flex; align-items: center; gap: 0.25rem">
          Nom de l’application
          <DsfrTooltip id="search-tooltip-desc" content="Recherche les applications dont le nom contient le texte saisi." />
        </span>
      </template>
    </DsfrInput>
    <TagSearchSelect
      :tags="filters.tag"
      tooltip-content="Recherche les applications associées à un ou plusieurs tags sélectionnés."
      data-testid="application-filter-tag"
      @update:tags="setFilter({ tag: $event, page: 0 })"
    />
    <DsfrInput
      :model-value="filters.link"
      label-visible
      aria-describedby="link-tooltip-desc"
      data-testid="application-filter-link"
      @update:model-value="setFilter({ link: $event?.toString(), page: 0 })"
    >
      <template #label>
        <span style="display: inline-flex; align-items: center; gap: 0.25rem">
          Lien externe
          <DsfrTooltip
            id="link-tooltip-desc"
            content="Recherche les applications par URL d’une ressource externe associée (documentation, service, supervision…)."
          />
        </span>
      </template>
    </DsfrInput>
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
