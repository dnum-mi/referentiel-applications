<script setup lang="ts">
import { toRef } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useDebouncedFn } from "@/composables/use-debouncefn";

const searchStore = useApplicationSearchStore();
const iqMin = toRef(searchStore.filters, "iqMin");
const iqMax = toRef(searchStore.filters, "iqMax");

const { run: debouncedSearch } = useDebouncedFn(() => {
  searchStore.setFilter("page", 0);
  searchStore.searchApplications();
}, 300);

watch([iqMin, iqMax], () => {
  debouncedSearch();
});
</script>

<template>
  <div>
    <label class="fr-label fr-mb-2w">
      Indice de qualité
      <br />
      <small> entre {{ iqMin === null || iqMin === "" ? 5 : iqMin }}% et {{ iqMax === null || iqMax === "" ? 100 : iqMax }}% </small>
    </label>

    <div class="fr-input-group">
      <DsfrInput label-visible label="IQ minimum" type="number" min="0" max="100" v-model.number="iqMin" />
      <DsfrInput label-visible label="IQ maximum" type="number" min="0" max="100" v-model.number="iqMax" />
    </div>
  </div>
</template>
