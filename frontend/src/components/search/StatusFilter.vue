<script lang="ts" setup>
import { ref, computed } from "vue";
import { statusApplicationDictionary } from "@/composables/use-dictionary";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useDebouncedFn } from "@/composables/use-debouncefn";

const searchStore = useApplicationSearchStore();
const modelValue = ref<string[]>(searchStore.filters.status ?? []);

const { run: debouncedSearch } = useDebouncedFn(() => {
  searchStore.setFilter("page", 0);
  searchStore.searchApplications();
}, 300);

const statusOptions = computed(() =>
  Object.keys(statusApplicationDictionary)
    .filter((key) => key !== "select")
    .map((value) => ({
      value,
      label: statusApplicationDictionary[value as keyof typeof statusApplicationDictionary],
      name: `${value}`,
    })),
);

const onStatusChange = (newStatus: unknown) => {
  if (!Array.isArray(newStatus)) return;

  const statusArray = newStatus.filter((val): val is string => typeof val === "string");
  modelValue.value = statusArray;

  console.log("✅ Nouveau statut sélectionné :", statusArray);

  // ✅ Ne pas envoyer [] dans le filtre
  if (statusArray.length === 0) {
    searchStore.setFilter("status", undefined);
  } else {
    searchStore.setFilter("status", statusArray);
  }

  searchStore.setFilter("page", 0);
  debouncedSearch();
};
</script>

<template>
  <div class="fr-container fr-my-2v">
    <DsfrCheckboxSet
      :model-value="modelValue"
      @update:modelValue="onStatusChange"
      :options="statusOptions"
      legend="Filtrer par statut"
      name="status"
    />
  </div>
</template>
