<script setup lang="ts">
import { useApplicationSearch, type Filters } from "@/composables/use-application-search";
import { EOL_STATUS_LABELS } from "@/utils/eol-status";

const { filters, setFilter } = useApplicationSearch();
const statusOptions = [
  { value: "", text: "Tous les statuts" },
  ...Object.entries(EOL_STATUS_LABELS).map(([value, text]) => ({ value, text })),
];

function setStatus(value: string | number) {
  setFilter({ technologyEolStatus: (value || undefined) as Filters["technologyEolStatus"], page: 0 });
}
</script>

<template>
  <DsfrSelect
    :model-value="filters.technologyEolStatus ?? ''"
    label="Fin de vie des technologies"
    label-visible
    hint="Applications utilisant au moins une technologie dans le statut sélectionné."
    :options="statusOptions"
    data-testid="technology-filter-eol-status"
    @update:model-value="setStatus"
  />
</template>
