<script setup lang="ts">
import { ref, watch } from "vue";
import { useApplicationSearch, type Filters } from "@/composables/use-application-search";
import { homologationStatusDict } from "@/constants/dictionary";

const { filters, setFilter } = useApplicationSearch();
const from = ref("");
const to = ref("");
const error = ref("");
watch(
  () => [filters.value.homologationDateFrom, filters.value.homologationDateTo],
  ([start, end]) => {
    from.value = start ?? "";
    to.value = end ?? "";
  },
  { immediate: true },
);
const statusOptions = [
  { value: "", text: "Tous les statuts" },
  ...Object.entries(homologationStatusDict).map(([value, text]) => ({ value, text })),
];
function setStatus(value: string | number) {
  setFilter({
    homologationStatus: (value || undefined) as Filters["homologationStatus"],
    homologationDateMode: filters.value.homologationDateMode === "expired" ? undefined : filters.value.homologationDateMode,
    page: 0,
  });
}
function applyDates() {
  error.value = from.value && to.value && from.value > to.value ? "La date de début doit précéder la date de fin." : "";
  if (error.value) return;
  setFilter({
    homologationDateFrom: from.value || undefined,
    homologationDateTo: to.value || undefined,
    homologationDateMode: from.value || to.value ? "range" : undefined,
    page: 0,
  });
}
</script>

<template>
  <fieldset class="fr-fieldset">
    <legend class="fr-fieldset__legend">Échéances d’homologation</legend>
    <p class="fr-hint-text">Dates calendaires de Paris. L’IQ mesure la complétude documentaire, pas la validité de l’homologation.</p>
    <DsfrSelect
      label="Statut déclaré"
      :model-value="filters.homologationStatus ?? ''"
      :options="statusOptions"
      @update:model-value="setStatus"
    />
    <DsfrInput v-model="from" label="Date de fin à partir du" label-visible type="date" />
    <DsfrInput v-model="to" label="Date de fin jusqu’au (inclus)" label-visible type="date" />
    <p v-if="error" role="alert" class="fr-error-text">{{ error }}</p>
    <DsfrButton type="button" secondary @click="applyDates">Appliquer les dates</DsfrButton>
    <DsfrSelect
      label="Filtre temporel"
      :model-value="filters.homologationDateMode ?? ''"
      :options="[
        { value: '', text: 'Toutes les dates' },
        { value: 'expired', text: 'Homologations expirées' },
        { value: 'range', text: 'Dans l’intervalle choisi', disabled: !filters.homologationDateFrom && !filters.homologationDateTo },
        { value: 'missing', text: 'Date non renseignée' },
      ]"
      @update:model-value="
        (value) =>
          setFilter({
            homologationDateMode: (value || undefined) as Filters['homologationDateMode'],
            ...(value === 'expired' ? { homologationStatus: 'homologuee' } : {}),
            page: 0,
          })
      "
    />
  </fieldset>
</template>
