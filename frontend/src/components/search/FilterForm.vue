<script setup lang="ts">
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";

const searchStore = useApplicationSearchStore();
</script>

<template>
  <div style="display: flex; justify-content: center;">
    <div class="filter-section" style="max-width: 1000px;">
      <div class="basic-filters">
        <SearchFilter />
        <DsfrButton
          v-if="!searchStore.advancedSearch" secondary size="small" data-testid="filter-form-advanced-button"
          @click="searchStore.advancedSearch = !searchStore.advancedSearch"
        >
          {{ searchStore.advancedSearch ? "Moins de filtres" : "Plus de filtres" }}
        </DsfrButton>
      </div>
      <div v-if="searchStore.advancedSearch" class="advanced-filters">
        <div>
          <TagFilter />
        </div>
        <div>
          <LinkFilter />
        </div>
        <div>
          <HostingFilter />
        </div>
        <div>
          <QualityFilter />
        </div>
        <div>
          <StatusFilter />
        </div>
        <div>
          <PriorityRestartFilter />
        </div>
      </div>
      <template v-if="searchStore.advancedSearch">
        <div class="advanced-filters">
          <ActorFilter />
          <OrganizationFilter />
        </div>
        <div>
          <DsfrButton
            tertiary
            size="small"
            class="reset-link"
            data-testid="sidebar-reset-filters-button"
            @click="searchStore.resetFilters"
          >
            ✕ Réinitialiser
          </DsfrButton>
          <DsfrButton
            v-if="searchStore.advancedSearch" secondary size="small" class="fr-mt-2w" data-testid="filter-form-advanced-button"
            @click="searchStore.advancedSearch = !searchStore.advancedSearch"
          >
            {{ searchStore.advancedSearch ? "Moins de filtres" : "Plus de filtres" }}
          </DsfrButton>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.filter-section {
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.basic-filters {
  display: flex;
  margin: 0;
  gap: 1rem;
  flex-direction: row;
}

.advanced-filters {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 768px) {
  .advanced-filters {
    grid-template-columns: 1fr;
  }
}
</style>
