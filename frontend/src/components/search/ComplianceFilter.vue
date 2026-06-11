<script lang="ts" setup>
import { useApplicationSearch, type Filters } from "@/composables/use-application-search";

// Sous-ensemble des conformités réellement filtrables (type exact du filtre).
type FilterableCompliance = NonNullable<Filters["compliance__in"]>[number];

const { filters, setFilter } = useApplicationSearch();
const complianceOptions: FilterableCompliance[] = ["dima", "pdma", "homologation", "rgaa", "dsfr", "rgpd"];

function toggleCompliance(value: FilterableCompliance, checked: boolean) {
  const selected = new Set<FilterableCompliance>(filters.value.compliance__in || []);
  if (checked) selected.add(value);
  else selected.delete(value);
  setFilter({ compliance__in: Array.from(selected) });
}
</script>

<template>
  <div>
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
