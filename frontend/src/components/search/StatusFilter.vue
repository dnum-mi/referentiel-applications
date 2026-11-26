<script lang="ts" setup>
import { computed } from "vue";
import { statusApplicationDictionary } from "@/constants/dictionary";
import { useApplicationSearch } from "@/composables/use-application-search";
import type { ApplicationStatus } from "@/client/types.gen";

const { filters, setFilter } = useApplicationSearch();

const statusCheckboxOptions = Object.keys(statusApplicationDictionary).map((value) => ({
  label: statusApplicationDictionary[value as keyof typeof statusApplicationDictionary],
  name: `status-option-${value}`,
  value,
  id: `status-option-${value}`,
}));

const withoutStatus = computed({
  get: () => (filters.value.currentStatus__isNull ? [true] : []),
  set: (value: boolean[]) => setFilter({ currentStatus__isNull: value.includes(true), page: 0 }),
});

const selectedStatuses = computed({
  get: () => [...(filters.value.currentStatus__in || [])],
  set: (value: ApplicationStatus[]) => {
    const statuses = value;
    setFilter({
      page: 0,
      currentStatus__in: statuses.length > 0 ? statuses : undefined,
      ...(statuses.length === 0 ? { currentStatus__isNull: true } : {}),
    });
  },
});
</script>

<template>
  <div data-testid="status-filter">
    <div class="without-status-option">
      <FilterWithHelp>
        <DsfrCheckbox
          v-model="withoutStatus"
          name="status-option-none"
          :value="true"
          aria-describedby="status-none-tooltip-desc"
          data-testid="status-option-none"
        >
          <template #label>Sans statut</template>
        </DsfrCheckbox>
        <template #help>
          <DsfrTooltip
            aria-label="Afficher l’aide sur le filtre Sans statut"
            id="status-none-tooltip-desc"
            content="Affiche uniquement les applications sans statut renseigné."
          />
        </template>
      </FilterWithHelp>
    </div>
    <DsfrCheckboxSet class="filter-checkbox-set" v-model="selectedStatuses" :options="statusCheckboxOptions">
      <template #legend>Statut de l'application</template>
      <DsfrTooltip
        class="fieldset-help"
        id="status-legend-tooltip-desc"
        aria-label="Afficher l’aide sur les filtres de statut de l’application"
        content="Filtre les applications selon leur statut de cycle de vie (en construction, en production, décommissionnée…)."
      />
      <DsfrCheckbox v-for="option in statusCheckboxOptions" :key="option.id" v-model="selectedStatuses" v-bind="option" />
    </DsfrCheckboxSet>
  </div>
</template>

<style scoped>
.filter-checkbox-set {
  position: relative;
}

.filter-checkbox-set :deep(fieldset) {
  position: static;
}

.filter-checkbox-set :deep(legend) {
  padding-inline-end: 2rem;
}

.filter-checkbox-set :deep(.fieldset-help) {
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
}

.without-status-option {
  margin-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.75rem;
}
</style>
