<script setup lang="ts">
import { computed } from "vue";
import { useApplicationSearch } from "@/composables/use-application-search";

const { filters, setFilter } = useApplicationSearch();

function clamp(value: number, defaultValue: number) {
  if (Number.isNaN(value)) return defaultValue;
  return Math.max(0, Math.min(100, value));
}

function updateMin(value: string | number | undefined) {
  const str = String(value ?? "");
  const parsed = Number.parseInt(str, 10);
  if (str !== "" && Number.isNaN(parsed)) return;
  const iqGte = clamp(parsed, 0);
  const iqLte = filters.value.iqLte != null && filters.value.iqLte < iqGte ? iqGte : filters.value.iqLte;
  setFilter({ iqGte, iqLte, page: 0 });
}

function updateMax(value: string | number | undefined) {
  const str = String(value ?? "");
  const parsed = Number.parseInt(str, 10);
  if (str !== "" && Number.isNaN(parsed)) return;
  const iqLte = clamp(parsed, 100);
  const iqGte = filters.value.iqGte != null && filters.value.iqGte > iqLte ? iqLte : filters.value.iqGte;
  setFilter({ iqGte, iqLte, page: 0 });
}

const includeNullIq = computed({
  get: () => (filters.value.iq__isNull ? [true] : []),
  set: (value: boolean[]) => setFilter({ iq__isNull: value.includes(true), page: 0 }),
});
</script>

<template>
  <fieldset class="fr-fieldset quality-filter" data-testid="quality-filter">
    <legend class="fr-fieldset__legend fr-label fr-mb-2w">
      <span style="display: inline-flex; align-items: center; gap: 0.25rem">
        Indice de qualité
        <DsfrTooltip
          id="quality-legend-tooltip-desc"
          content="Filtre les applications selon leur indice de qualité (IQ), un score global de 0 à 100 %. Les applications sans IQ calculé (décommissionnées ou supprimées) peuvent être incluses en plus de cette plage grâce à l'option ci-dessous."
        />
      </span>
      <br />
      <small data-testid="quality-filter-summary">
        entre {{ filters.iqGte ?? 0 }}% et {{ filters.iqLte ?? 100 }}%<template v-if="filters.iq__isNull">
          · applications sans IQ incluses</template
        >
      </small>
    </legend>
    <DsfrInputGroup class="quality-filter-range">
      <DsfrInput
        :model-value="filters.iqGte"
        label-visible
        type="number"
        pattern="\d*"
        min="0"
        :max="(filters.iqLte ?? 100) + 1"
        data-testid="quality-filter-min"
        @update:model-value="updateMin"
      >
        <template #label>IQ minimum</template>
      </DsfrInput>
      <span class="quality-filter-range-separator" aria-hidden="true">—</span>
      <DsfrInput
        :model-value="filters.iqLte"
        label-visible
        type="number"
        pattern="\d*"
        :min="(filters.iqGte ?? 0) - 1"
        max="100"
        data-testid="quality-filter-max"
        @update:model-value="updateMax"
      >
        <template #label>IQ maximum</template>
      </DsfrInput>
    </DsfrInputGroup>
    <div class="quality-filter-null-option">
      <DsfrCheckbox v-model="includeNullIq" name="quality-option-include-null" :value="true" data-testid="quality-filter-include-null">
        <template #label>Inclure les applications sans IQ</template>
      </DsfrCheckbox>
    </div>
  </fieldset>
</template>

<style scoped>
.quality-filter-range {
  align-items: flex-end;
  gap: 0.5rem;
}

.quality-filter-range-separator {
  padding-bottom: 0.75rem;
  color: var(--text-mention-grey, #666);
}

.quality-filter-null-option {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-default-grey, #e5e7eb);
}
</style>
