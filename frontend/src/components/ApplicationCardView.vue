<script setup lang="ts">
import { computed, watch } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useStatisticsStore } from "@/stores/statisticsStore";
import PaginationFooter from "./PaginationFooter.vue";

const searchStore = useApplicationSearchStore();
const statsStore = useStatisticsStore();

const paginatedResults = computed(() => searchStore.results);

const pages = computed(() => {
  const totalPages = Math.ceil(searchStore.total / (searchStore.pageSize ?? searchStore.initialFilters.pageSize));
  return Array.from({ length: totalPages }).map((_, i) => ({
    label: `${i + 1}`,
    title: `Page ${i + 1}`,
    href: `#page-${i + 1}`,
  }));
});

watch([() => searchStore.page, () => searchStore.pageSize], () => {
  searchStore.searchApplications();
});
</script>

<template>
  <div>
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
      :total-all="statsStore.totalApplications ?? 0"
      :pages="pages"
      :limit="searchStore.pageSize ?? 0"
      :page="searchStore.page"
      data-testid="application-pagination-footer"
      @update:limit="searchStore.pageSize = $event"
      @update:page="searchStore.page = $event"
    />
  </div>
</template>

<style scoped>
.card-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.5rem;
}
</style>
