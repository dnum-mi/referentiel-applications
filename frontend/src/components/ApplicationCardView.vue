<script setup lang="ts">
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
const searchStore = useApplicationSearchStore();
</script>

<template>
  <div class="card-container">
    <DsfrCard
      class="fixed-card"
      v-for="(app, index) in searchStore.results"
      :key="index"
      :title="app.label || 'Application'"
      :img-src="app.logo || ''"
      :to="{ name: 'application', params: { id: app.id } }"
    />
    <div v-if="!searchStore.results.length" class="empty-message">
      <p>Aucune application trouvée avec les filtres actuels.</p>
    </div>
  </div>
</template>

<style scoped>
.card-container {
  margin: 2em;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.fixed-card {
  height: 300px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.empty-message {
  text-align: center;
  padding: 2rem;
  font-style: italic;
  color: #666;
}
</style>
