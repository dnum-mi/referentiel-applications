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
    v-model="selectedPriorities"
    legend="Priorité de redémarrage"
    :options="priorityCheckboxOptions"
    data-testid="priority-restart-filter"
  />
</template>
