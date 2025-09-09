<script setup lang="ts">
import SearchBar from "./SearchBar.vue";
import ActorFilter from "./ActorFilter.vue";
import HostingFilter from "./HostingFilter.vue";
import ApplicationFilter from "./ApplicationFilter.vue";
</script>

<template>
  <aside class="filters-panel" data-testid="filters-panel">
    <SearchBar data-testid="filters-search-bar" />
    <ActorFilter data-testid="filters-actor" />
    <HostingFilter data-testid="filters-hosting" />
    <ApplicationFilter data-testid="filters-application" />
  </aside>
</template>

<style scoped>
.filters-panel {
  width: 280px;
  padding: 1rem;
  border-right: 1px solid #e0e0e0;
  background: white;
}
</style>
