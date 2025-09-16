<script setup lang="ts">
import type { ApplicationPriorityRestart } from "@/client/types.gen.js";
import { priorityRestartLabelsOptions } from "@/composables/use-dictionary.js";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";

const values = ref<string[]>([]);
const searchStore = useApplicationSearchStore();
watch(values, (vals) => {
  searchStore.setFilter({ priorityRestart: vals as ApplicationPriorityRestart[] });
});
</script>

<template>
  <DsfrMultiselect
    v-model="values"
    label="Priorité de redémarrage"
    :options="priorityRestartLabelsOptions"
    :search="false"
    :select-all="false"
    id-key="value"
    label-key="text"
    :button-label="values.join(', ') || 'Sélectionner...'"
  />
</template>
