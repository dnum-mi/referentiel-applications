<script lang="ts" setup>
import { useApplicationSearchStore } from '@/stores/applicationSearchStore';
import type { ComplianceType } from '@/composables/use-dictionary';


const searchStore = useApplicationSearchStore();
const complianceOptions: ComplianceType[] = ["dima", "pdma", "homologation", "rgaa", "dsfr"];

function toggleCompliance(value: ComplianceType, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;

  const selected = new Set<ComplianceType>(searchStore.filters.compliance__in || []);
  if (checked) {
    selected.add(value);
  } else {
    selected.delete(value);
  }

  searchStore.setFilter({ compliance__in: Array.from(selected) });
}

</script>
    
<template>
  <div>
    <legend class="fr-label fr-mb-2w">
      Conformité RGAA
    </legend>
    <div data-testid="compliance-filter">
      <label v-for="option in complianceOptions" :key="option" class="checkbox-item">
        <input
          type="checkbox"
          :value="option"
          :checked="searchStore.filters.compliance__in?.includes(option)"
          :data-testid="`compliance-option-${option}`"
          @change="(e) => toggleCompliance(option, e)"
        >
        {{ option.toUpperCase() }}
      </label>
    </div>

  </div>
</template>