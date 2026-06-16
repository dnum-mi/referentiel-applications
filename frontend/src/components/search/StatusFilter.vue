<script lang="ts" setup>
import { computed } from "vue";
import { statusApplicationDictionary } from "@/constants/dictionary";
import { useApplicationSearch } from "@/composables/use-application-search";
import type { ApplicationStatus } from "@/client/types.gen";

const { filters, setFilter } = useApplicationSearch();

const statusCheckboxOptions = Object.keys(statusApplicationDictionary).map((value) => ({
  label: statusApplicationDictionary[value as keyof typeof statusApplicationDictionary],
  name: `status-option-${value}`,
  value,
  id: `status-option-${value}`,
}));

const withoutStatus = computed({
  get: () => (filters.value.currentStatus__isNull ? [true] : []),
  set: (value: boolean[]) => setFilter({ currentStatus__isNull: value.includes(true) }),
});

const selectedStatuses = computed({
  get: () => [...(filters.value.currentStatus__in || [])],
  set: (value: ApplicationStatus[]) => {
    const statuses = value;
    setFilter({
      currentStatus__in: statuses.length > 0 ? statuses : undefined,
      ...(statuses.length === 0 ? { currentStatus__isNull: true } : {}),
    });
  },
});
</script>

<template>
  <div data-testid="status-filter">
    <div class="without-status-option">
      <DsfrCheckbox
        v-model="withoutStatus"
        name="status-option-none"
        :value="true"
        label="Sans statut"
        hint="Filtrer les applications sans statut"
        data-testid="status-option-none"
      />
    </div>
    <DsfrCheckboxSet v-model="selectedStatuses" legend="Statut de l'application" :options="statusCheckboxOptions" />
  </div>
</template>

<style scoped>
.without-status-option {
  margin-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.75rem;
}
</style>
