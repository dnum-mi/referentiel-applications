<script lang="ts" setup>
import { computed, toRef } from "vue";
import { statusApplicationDictionary } from "@/composables/use-dictionary";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useDebouncedFn } from "@/composables/use-debouncefn";
import type { ApplicationStatus } from "@/client/types.gen";

const searchStore = useApplicationSearchStore();
const selectedStatuses = toRef(searchStore.filters, "status__in");

const { run: debouncedSearch } = useDebouncedFn(() => {
  searchStore.setFilter("page", 0);
  searchStore.searchApplications();
}, 300);

const statusOptions = computed(() =>
  Object.keys(statusApplicationDictionary)
    .filter(key => key !== "select")
    .map(value => ({
      value,
      label: statusApplicationDictionary[value as keyof typeof statusApplicationDictionary],
      name: value,
    })),
);

function onStatusChange(status__in: ApplicationStatus[]) {
  searchStore.setFilter("status__in", status__in.length > 0 ? status__in : undefined);
  searchStore.setFilter("page", 0);
  debouncedSearch();
}
</script>

<template>
  <div class="fr-container fr-my-2v">
    <DsfrCheckboxSet
      data-testid="status-filter-checkboxes"
      :model-value="selectedStatuses || []"
      :options="statusOptions"
      legend="Filtrer par statut"
      name="status"
      @update:model-value="onStatusChange"
    />
  </div>
</template>
