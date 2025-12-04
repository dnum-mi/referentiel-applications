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
const allStatusValues = statusOptions.map(option => option.value as ApplicationStatus);

const selectedStatus = computed(() => searchStore.filters.currentStatus__in);
const isWithoutStatusActive = computed(() => Boolean(searchStore.filters.currentStatus__isNull));

function toggleStatus(value: ApplicationStatus, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;

  const selected = new Set<ApplicationStatus>(searchStore.filters.currentStatus__in || []);
  if (checked) {
    selected.add(value);
  } else {
    selected.delete(value);
  }

  searchStore.setFilter(
    selected.size === 0
      ? {
          currentStatus__in: undefined,
          currentStatus__isNull: true,
        }
      : {
          currentStatus__in: Array.from(selected),
          ...(searchStore.filters.currentStatus__isNull
            ? { currentStatus__isNull: undefined }
            : {}),
        },
  );
}

function toggleWithoutStatus(event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  searchStore.setFilter(
    checked
      ? {
          currentStatus__isNull: true,
          currentStatus__in: undefined,
        }
      : {
          currentStatus__isNull: undefined,
          currentStatus__in: allStatusValues,
        },
  );
}
</script>

<template>
  <div>
    <legend class="fr-label fr-mb-2w">
      Statut de l'application
    </legend>
    <div data-testid="status-filter">
      <label class="checkbox-item without-status-option">
        <input
          type="checkbox"
          :checked="isWithoutStatusActive"
          data-testid="status-option-none"
          aria-describedby="withoutStatusDescriptionId"
          @change="toggleWithoutStatus"
        >
        Sans statut
        <span id="withoutStatusDescriptionId" class="sr-only">Filtrer les applications sans statut</span>
      </label>

      <label
        v-for="option in statusOptions"
        :key="option.value"
        class="checkbox-item"
      >
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

<style scoped>
.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.without-status-option {
  margin-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.75rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
