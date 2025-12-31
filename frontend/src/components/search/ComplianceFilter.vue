<script lang="ts" setup>
import { useApplicationSearch } from "@/composables/use-application-search";
import type { ComplianceType } from "@/composables/use-dictionary";

const { filters, setFilter } = useApplicationSearch();
const complianceOptions: ComplianceType[] = ["dima", "pdma", "homologation", "rgaa", "dsfr"];

function toggleCompliance(value: ComplianceType, checked: boolean) {
  const selected = new Set<ComplianceType>(filters.value.compliance__in || []);
  checked ? selected.add(value) : selected.delete(value);
  setFilter({ compliance__in: Array.from(selected) });
}
</script>

<template>
  <div>
    <legend class="fr-label fr-mb-2w">Conformité RGAA</legend>
    <div data-testid="compliance-filter">
      <label v-for="option in complianceOptions" :key="option" class="checkbox-item">
        <input
          type="checkbox"
          :value="option"
          :checked="filters.compliance__in?.includes(option)"
          :data-testid="`compliance-option-${option}`"
          @change="(e) => toggleCompliance(option, (e.target as HTMLInputElement).checked)"
        />
        {{ option.toUpperCase() }}
      </label>
    </div>
  </div>
</template>
