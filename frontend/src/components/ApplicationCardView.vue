<script setup lang="ts">
import { useApplicationSearch } from "@/composables/use-application-search";
import PaginationFooter from "./PaginationFooter.vue";

const { results, total, page, pageSize } = useApplicationSearch();
</script>

<template>
  <div class="card-container" data-testid="application-card-container">
    <DsfrCard
      v-for="app in results"
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
    :total-filtered="total"
    :limit="pageSize"
    :page="page"
    data-testid="application-pagination-footer"
    @update:limit="pageSize = $event"
    @update:page="page = $event"
  />
</template>

<style scoped>
.card-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.5rem;
}
</style>
