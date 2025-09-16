<script lang="ts" setup>
import { computed } from "vue";
import { statusApplicationDictionary } from "@/composables/use-dictionary";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import type { ApplicationStatus } from "@/client/types.gen";

const searchStore = useApplicationSearchStore();

const statusOptions = Object.keys(statusApplicationDictionary)
  .map(value => ({
    value,
    label: statusApplicationDictionary[value as keyof typeof statusApplicationDictionary],
  }));

const selectedStatusNames = computed<string>(() => {
  const names = statusOptions
    .filter(option => searchStore.filters.status__in?.includes(option.value as ApplicationStatus))
    .map(option => option.label);
  if (names.length === statusOptions.length) {
    return "Tous";
  }
  if (names.length === 0) {
    return "Sélectionner...";
  }
  return names.join(", ");
});
const values = ref<string[]>([]);
watch(values, (vals) => {
  searchStore.setFilter({ status__in: vals as ApplicationStatus[] });
});
</script>

<template>
  <DsfrMultiselect
    v-model="values"
    label="Statut"
    :options="statusOptions"
    :search="false"
    :select-all="false"
    id-key="value"
    label-key="label"
    :button-label="selectedStatusNames"
  />
</template>
