<script lang="ts" setup>
import { statusApplicationDictionary } from "@/composables/use-dictionary";
import { useApplicationSearch } from "@/composables/use-application-search";
import type { ApplicationStatus } from "@/client/types.gen";

const { filters, setFilter } = useApplicationSearch();

const statusOptions = Object.keys(statusApplicationDictionary).map((value) => ({
  value,
  label: statusApplicationDictionary[value as keyof typeof statusApplicationDictionary],
}));

function toggleStatus(value: ApplicationStatus, checked: boolean) {
  const selected = new Set<ApplicationStatus>(filters.value.currentStatus__in || []);
  checked ? selected.add(value) : selected.delete(value);

  setFilter({
    currentStatus__in: selected.size > 0 ? Array.from(selected) : undefined,
    ...(selected.size === 0 ? { currentStatus__isNull: true } : {}),
  });
}

function toggleWithoutStatus(checked: boolean) {
  setFilter({ currentStatus__isNull: checked });
}
</script>

<template>
  <legend class="fr-label fr-mb-2w">Statut de l'application</legend>
  <div data-testid="status-filter">
    <label class="checkbox-item without-status-option">
      <input
        type="checkbox"
        :checked="filters.currentStatus__isNull"
        data-testid="status-option-none"
        aria-describedby="withoutStatusDescriptionId"
        @change="(e) => toggleWithoutStatus((e.target as HTMLInputElement).checked)"
      />
      Sans statut
      <span id="withoutStatusDescriptionId" class="sr-only">Filtrer les applications sans statut</span>
    </label>

    <label v-for="option in statusOptions" :key="option.value" class="checkbox-item">
      <input
        type="checkbox"
        :value="option.value"
        :checked="filters.currentStatus__in?.includes(option.value as ApplicationStatus)"
        :data-testid="`status-option-${option.value}`"
        @change="(e) => toggleStatus(option.value as ApplicationStatus, (e.target as HTMLInputElement).checked)"
      />
      {{ option.label }}
    </label>
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
