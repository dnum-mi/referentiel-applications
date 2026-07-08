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
  <DsfrCheckboxSet v-model="selectedPriorities" :options="priorityCheckboxOptions" data-testid="priority-restart-filter">
    <template #legend>
      <span style="display: inline-flex; align-items: center; gap: 0.25rem">
        Priorité de redémarrage
        <DsfrTooltip
          content="Filtre les applications selon leur priorité de redémarrage en cas d’incident, de R0 (socle technique indispensable, relance immédiate) à R3 (indisponibilité sans conséquence opérationnelle)."
        />
      </span>
    </template>
  </DsfrCheckboxSet>
</template>
