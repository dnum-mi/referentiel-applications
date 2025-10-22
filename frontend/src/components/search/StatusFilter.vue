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
    name: value,
  }));

const selectedStatus = computed(() => searchStore.filters.status__in);

function toggleStatus(value: ApplicationStatus, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;

  const selected = new Set<ApplicationStatus>(searchStore.filters.status__in || []);
  if (checked) {
    selected.add(value);
  } else {
    selected.delete(value);
  }

  searchStore.setFilter({ status__in: Array.from(selected) });
}
</script>

<template>
  <div>
    <legend class="fr-label fr-mb-2w">
      Statut de l'application
    </legend>
    <div data-testid="status-filter">
      <label v-for="option in statusOptions" :key="option.value" class="checkbox-item">
        <input
          type="checkbox"
          :value="option.value"
          :checked="selectedStatus?.includes(option.value as ApplicationStatus)"
          :data-testid="`status-option-${option.value}`"
          @change="(e) => toggleStatus(option.value as ApplicationStatus, e)"
        >
        {{ option.label }}
      </label>
    </div>
  </div>
</template>
