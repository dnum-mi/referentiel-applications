<script setup lang="ts">
import { computed, watch } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import PaginationFooter from "./PaginationFooter.vue";

const searchStore = useApplicationSearchStore();

const paginatedResults = computed(() => searchStore.results);

watch([() => searchStore.page, () => searchStore.pageSize], () => {
  searchStore.searchApplications();
});
</script>

<template>
  <div class="card-container" data-testid="application-card-container">
    <DsfrCard
      v-for="app in paginatedResults"
      :key="app.id"
      :title="app.label || 'Application'"
      :img-src="app.logo || ''"
      :link="{ name: 'application', params: { id: app.id } }"
      description="Consulter l'application"
      size="md"
      :data-testid="`application-card-${app.id}`"
    />
  </div>

  <PaginationFooter
    :total-filtered="searchStore.total ?? 0"
    :limit="searchStore.pageSize ?? 10"
    :page="searchStore.page ?? 0"
    data-testid="application-pagination-footer"
    @update:limit="searchStore.pageSize = $event"
    @update:page="searchStore.page = $event"
  />
</template>

<style scoped>
.card-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.5rem;
}
</style>
