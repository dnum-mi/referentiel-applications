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
</script>

<template>
  <div>
    <label class="fr-label fr-mb-2w">
      Indice de qualité
      <br />
      <small> entre {{ iqGte === "" ? 0 : iqGte }}% et {{ iqLte === "" ? 100 : iqLte }}% </small>
    </label>

    <div class="fr-input-group">
      <DsfrInput label-visible label="IQ minimum" type="number" min="0" max="100" v-model.number="iqGte" />
      <DsfrInput label-visible label="IQ maximum" type="number" min="0" max="100" v-model.number="iqLte" />
    </div>
  </div>
</template>
