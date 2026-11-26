<script setup lang="ts">
import { computed } from "vue";
import { useApplicationSearch } from "@/composables/use-application-search";
import { priorityRestartLabelsOptions } from "@/constants/dictionary";
import type { ApplicationPriorityRestart } from "@/client/types.gen.js";

const { filters, setFilter } = useApplicationSearch();

const priorityCheckboxOptions = priorityRestartLabelsOptions.map((option) => ({
  label: option.text,
  name: `priority-restart-option-${option.value}`,
  value: option.value,
  id: `priority-restart-option-${option.value}`,
}));

const selectedPriorities = computed({
  get: () => [...(filters.value.priorityRestart || [])],
  set: (value: ApplicationPriorityRestart[]) => setFilter({ priorityRestart: value }),
});
</script>

<template>
  <DsfrCheckboxSet
    class="filter-checkbox-set"
    v-model="selectedPriorities"
    :options="priorityCheckboxOptions"
    data-testid="priority-restart-filter"
    aria-describedby="priority-legend-tooltip-desc"
  >
    <template #legend>Priorité de redémarrage</template>
    <DsfrTooltip
      class="fieldset-help"
      id="priority-legend-tooltip-desc"
      aria-label="Afficher l’aide sur le filtre Priorité de redémarrage"
      content="Filtre les applications selon leur priorité de redémarrage en cas d’incident, de R0 (socle technique indispensable, relance immédiate) à R3 (indisponibilité sans conséquence opérationnelle)."
    />
    <DsfrCheckbox v-for="option in priorityCheckboxOptions" :key="option.id" v-model="selectedPriorities" v-bind="option" />
  </DsfrCheckboxSet>
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
</style>
