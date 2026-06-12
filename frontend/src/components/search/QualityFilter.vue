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
  <div data-testid="quality-filter">
    <legend class="fr-label fr-mb-2w">
      Indice de qualité<br />
      <small>entre {{ filters.iqGte ?? 0 }}% et {{ filters.iqLte ?? 100 }}%</small>
    </legend>
    <DsfrInputGroup>
      <DsfrInput
        :model-value="filters.iqGte"
        label-visible
        label="IQ minimum"
        type="number"
        pattern="\d*"
        min="0"
        :max="(filters.iqLte ?? 100) + 1"
        data-testid="quality-filter-min"
        @update:model-value="updateMin"
      />
      <DsfrInput
        :model-value="filters.iqLte"
        label-visible
        label="IQ maximum"
        type="number"
        pattern="\d*"
        :min="(filters.iqGte ?? 0) - 1"
        max="100"
        data-testid="quality-filter-max"
        @update:model-value="updateMax"
      />
    </DsfrInputGroup>
  </div>
</template>
