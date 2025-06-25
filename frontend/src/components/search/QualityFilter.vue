<script setup lang="ts">
import { ref, computed, watchEffect, toRef } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useDebouncedFn } from "@/composables/use-debouncefn";

const searchStore = useApplicationSearchStore();
const iqMin = toRef(searchStore.filters, "iqMin");
const iqMax = toRef(searchStore.filters, "iqMax");

const { run: debouncedSearch } = useDebouncedFn(() => {
  searchStore.setFilter("page", 0);
  searchStore.searchApplications();
}, 300);

watchEffect(() => {
  if (iqMin.value < 5) iqMin.value = 5;
  if (iqMax.value > 100) iqMax.value = 100;
  debouncedSearch();
});

const displayIqMin = computed(() => iqMin.value || 5);
const displayIqMax = computed(() => (!iqMax.value || iqMax.value > 100 ? 100 : iqMax.value));
</script>

<template>
  <div>
    <label class="fr-label fr-mb-2w">
      Indice de qualité
      <br />
      <small>
        {{ iqMin !== 5 || iqMax !== 100 ? `entre ${displayIqMin}% et ${displayIqMax}%` : "aucun filtre IQ appliqué" }}
      </small>
    </label>

    <div class="fr-input-group">
      <DsfrInput label-visible label="IQ minimum" type="number" min="5" max="100" v-model.number="iqMin" />
      <DsfrInput label-visible label="IQ maximum" type="number" min="5" max="100" v-model.number="iqMax" />
    </div>
  </div>
</template>
