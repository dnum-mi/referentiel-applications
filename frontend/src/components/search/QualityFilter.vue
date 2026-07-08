<script setup lang="ts">
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
</script>

<template>
  <fieldset class="fr-fieldset" data-testid="quality-filter">
    <legend class="fr-fieldset__legend fr-label fr-mb-2w">
      <span style="display: inline-flex; align-items: center; gap: 0.25rem">
        Indice de qualité
        <DsfrTooltip
          id="quality-legend-tooltip-desc"
          content="Filtre les applications selon leur indice de qualité (IQ), un score global de 0 à 100 %."
        />
      </span>
      <br />
      <small>entre {{ filters.iqGte ?? 0 }}% et {{ filters.iqLte ?? 100 }}%</small>
    </legend>
    <DsfrInputGroup>
      <DsfrInput
        :model-value="filters.iqGte"
        label-visible
        type="number"
        pattern="\d*"
        min="0"
        :max="(filters.iqLte ?? 100) + 1"
        aria-describedby="quality-min-tooltip-desc"
        data-testid="quality-filter-min"
        @update:model-value="updateMin"
      >
        <template #label>
          <span style="display: inline-flex; align-items: center; gap: 0.25rem">
            IQ minimum
            <DsfrTooltip id="quality-min-tooltip-desc" content="Borne inférieure de l’indice de qualité (IQ) à filtrer." />
          </span>
        </template>
      </DsfrInput>
      <DsfrInput
        :model-value="filters.iqLte"
        label-visible
        type="number"
        pattern="\d*"
        :min="(filters.iqGte ?? 0) - 1"
        max="100"
        aria-describedby="quality-max-tooltip-desc"
        data-testid="quality-filter-max"
        @update:model-value="updateMax"
      >
        <template #label>
          <span style="display: inline-flex; align-items: center; gap: 0.25rem">
            IQ maximum
            <DsfrTooltip id="quality-max-tooltip-desc" content="Borne supérieure de l’indice de qualité (IQ) à filtrer." />
          </span>
        </template>
      </DsfrInput>
    </DsfrInputGroup>
  </fieldset>
</template>
