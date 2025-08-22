<script setup lang="ts">
import { toRef } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useDebouncedFn } from "@/composables/use-debouncefn";

const searchStore = useApplicationSearchStore();
const iqGte = toRef(searchStore.filters, "iqGte");
const iqLte = toRef(searchStore.filters, "iqLte");

const { run: debouncedSearch } = useDebouncedFn(() => {
  searchStore.setFilter("page", 0);
  searchStore.searchApplications();
}, 300);

watch([iqGte, iqLte], () => {
  debouncedSearch();
});

const iqGteDisplay = computed(() => {
  return !iqGte.value ? 0 : iqGte.value;
});
const iqLteDisplay = computed(() => {
  return !iqLte.value ? 100 : iqLte.value;
});
</script>

<template>
  <div>
    <legend class="fr-label fr-mb-2w">
      Indice de qualité
      <br>
      <small> entre {{ iqGteDisplay }}% et {{ iqLteDisplay }}% </small>
    </legend>

    <div class="fr-input-group">
      <DsfrInput v-model.number="iqGte" label-visible label="IQ minimum" type="number" min="0" max="100" />
      <DsfrInput v-model.number="iqLte" label-visible label="IQ maximum" type="number" min="0" max="100" />
    </div>
  </div>
</template>
