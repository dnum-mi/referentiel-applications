<script setup lang="ts">
import { computed } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";

const searchStore = useApplicationSearchStore();

const tag = computed(() => searchStore.filters.tag?.[0]);

function updateTag(val: string) {
  searchStore.setFilter({ tag: [val], page: 0 });
}
</script>

<template>
  <DsfrInput
    v-model="tag"
    :label-visible="false"
    placeholder="Tag"
    data-testid="application-filter-tag"
    @update:model-value="updateTag($event)"
  />
</template>
