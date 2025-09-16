<script setup lang="ts">
import { computed } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";

const searchStore = useApplicationSearchStore();

const link = computed(() => searchStore.filters.link);

function updateLink(val: string) {
  searchStore.setFilter({ link: val, page: 0 });
}
</script>

<template>
  <DsfrInput
    v-model="link"
    :label-visible="false"
    placeholder="Lien externe"
    data-testid="application-filter-link"
    @update:model-value="updateLink"
  />
</template>
