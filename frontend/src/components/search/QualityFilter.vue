<script setup lang="ts">
import { toRef } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";

const searchStore = useApplicationSearchStore();
const iqGte = toRef(searchStore.filters, "iqGte");
const iqLte = toRef(searchStore.filters, "iqLte");

const iqGteDisplay = computed(() => !iqGte.value ? 0 : iqGte.value);
const iqLteDisplay = computed(() => !iqLte.value ? 100 : iqLte.value);

function clamp(value: number, defaultValue: number) {
  if (Number.isNaN(value)) return defaultValue;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}
function updateMin(value: string) {
  const parsedValue = Number.parseInt(value, 10);
  if (value !== "" && Number.isNaN(parsedValue)) {
    return;
  }
  iqGte.value = clamp(parsedValue, 0);
  if (iqLte.value != null && iqLte.value < iqGte.value) {
    iqLte.value = iqGte.value;
  }
  searchStore.setFilter({ iqGte: iqGte.value, page: 0 });
}
function updateMax(value: string) {
  const parsedValue = Number.parseInt(value, 10);
  if (value !== "" && Number.isNaN(parsedValue)) {
    return;
  }
  iqLte.value = clamp(parsedValue, 100);
  if (iqGte.value != null && iqGte.value > iqLte.value) {
    iqGte.value = iqLte.value;
  }
  searchStore.setFilter({ iqLte: iqLte.value, page: 0 });
}
</script>

<template>
  <div data-testid="quality-filter">
    <legend class="fr-label fr-mb-2w">
      Indice de qualité
      <br>
      <small> entre {{ iqGteDisplay }}% et {{ iqLteDisplay }}% </small>
    </legend>

    <DsfrInputGroup>
      <DsfrInput
        v-model.number="searchStore.filters.iqGte"
        label-visible label="IQ minimum"
        type="number"
        pattern="\d*"
        min="0"
        :max="iqLteDisplay + 1"
        data-testid="quality-filter-min"
        @update:model-value="updateMin"
      />
      <DsfrInput
        v-model.number="searchStore.filters.iqLte"
        label-visible label="IQ maximum"
        type="number"
        pattern="\d*"
        :min="iqGteDisplay - 1"
        max="100"
        data-testid="quality-filter-max"
        @update:model-value="updateMax"
      />
    </DsfrInputGroup>
  </div>
</template>
