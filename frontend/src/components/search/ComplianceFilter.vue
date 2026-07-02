<script lang="ts" setup>
import { useApplicationSearch } from "@/composables/use-application-search";
import {
  complianceBooleanCriteria,
  complianceFilterCriteria,
  complianceFilterLabels,
  type ComplianceFilterCriterion,
} from "@/constants/dictionary";

const { filters, setFilter } = useApplicationSearch();

type ComplianceState = "all" | "present" | "absent" | "unset";

const isBoolean = (criterion: ComplianceFilterCriterion) => complianceBooleanCriteria.includes(criterion);

// Critères booléens : Tous / Oui / Non / Non renseigné. Autres : Tous / Présent / Absent.
function optionsFor(criterion: ComplianceFilterCriterion): { value: ComplianceState; text: string }[] {
  if (isBoolean(criterion)) {
    return [
      { value: "all", text: "Tous" },
      { value: "present", text: "Oui" },
      { value: "absent", text: "Non" },
      { value: "unset", text: "Non renseigné" },
    ];
  }
  return [
    { value: "all", text: "Tous" },
    { value: "present", text: "Présent" },
    { value: "absent", text: "Absent" },
  ];
}

function stateOf(criterion: ComplianceFilterCriterion): ComplianceState {
  if (filters.value.compliancePresent__in?.includes(criterion)) return "present";
  if (filters.value.complianceAbsent__in?.includes(criterion)) return "absent";
  if (filters.value.complianceUnset__in?.includes(criterion)) return "unset";
  return "all";
}

function setState(criterion: ComplianceFilterCriterion, state: string | number) {
  const present = new Set(filters.value.compliancePresent__in ?? []);
  const absent = new Set(filters.value.complianceAbsent__in ?? []);
  const unset = new Set(filters.value.complianceUnset__in ?? []);
  present.delete(criterion);
  absent.delete(criterion);
  unset.delete(criterion);
  if (state === "present") present.add(criterion);
  else if (state === "absent") absent.add(criterion);
  else if (state === "unset") unset.add(criterion);
  setFilter({
    compliancePresent__in: present.size ? Array.from(present) : undefined,
    complianceAbsent__in: absent.size ? Array.from(absent) : undefined,
    complianceUnset__in: unset.size ? Array.from(unset) : undefined,
    page: 0,
  });
}
</script>

<template>
  <fieldset data-testid="compliance-filter" class="fr-fieldset compliance-filters">
    <legend class="fr-fieldset__legend fr-label">Conformité</legend>
    <DsfrSelect
      v-for="criterion in complianceFilterCriteria"
      :key="criterion"
      :label="complianceFilterLabels[criterion]"
      :model-value="stateOf(criterion)"
      :options="optionsFor(criterion)"
      :name="`compliance-${criterion}`"
      :data-testid="`compliance-option-${criterion}`"
      @update:model-value="(state: string | number) => setState(criterion, state)"
    />
  </fieldset>
</template>

<style scoped>
.compliance-filters {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/*
 * Le <select> natif DSFR gère nativement les libellés longs (« Non renseigné »)
 * dans une sidebar étroite (223px) sans troncature ni passage à la ligne :
 * on borne simplement la liste à la largeur disponible.
 */
.compliance-filters :deep(.fr-select) {
  max-width: 100%;
}
</style>
