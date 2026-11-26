<script setup lang="ts">
import { useApplicationSearch } from "@/composables/use-application-search";

const { filters, setFilter } = useApplicationSearch();
</script>

<template>
  <div class="filter-section">
    <FilterWithHelp>
      <DsfrInput
        :model-value="filters.search"
        label-visible
        description-id="search-tooltip-desc"
        data-testid="application-filter-label"
        @update:model-value="setFilter({ search: $event?.toString(), page: 0 })"
      >
        <template #label>Nom de l’application</template>
      </DsfrInput>
      <template #help>
        <DsfrTooltip
          aria-label="Afficher l’aide sur le filtre Nom de l’application"
          id="search-tooltip-desc"
          content="Recherche les applications dont le nom contient le texte saisi."
        />
      </template>
    </FilterWithHelp>
    <TagSearchSelect
      :tags="filters.tag"
      tooltip-content="Recherche les applications associées à un ou plusieurs tags sélectionnés."
      data-testid="application-filter-tag"
      @update:tags="setFilter({ tag: $event, page: 0 })"
    />
    <FilterWithHelp>
      <DsfrInput
        :model-value="filters.link"
        label-visible
        description-id="link-tooltip-desc"
        data-testid="application-filter-link"
        @update:model-value="setFilter({ link: $event?.toString(), page: 0 })"
      >
        <template #label>Lien externe</template>
      </DsfrInput>
      <template #help>
        <DsfrTooltip
          aria-label="Afficher l’aide sur le filtre Lien externe"
          id="link-tooltip-desc"
          content="Recherche les applications par URL d’une ressource externe associée (documentation, service, supervision…)."
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
