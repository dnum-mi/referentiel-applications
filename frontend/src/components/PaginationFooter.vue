<script setup lang="ts">
defineProps<{
  totalFiltered: number;
  pages: { label: string; title: string; href: string }[];
  limit: number;
  page: number;
}>();

const emit = defineEmits<{
  (e: "update:limit", value: number): void;
  (e: "update:page", value: number): void;
}>();
</script>

<template>
  <div class="footer-bar">
    <div class="footer-item">
      <label for="rows-per-page" class="fr-label">Résultats par page</label>
      <select id="rows-per-page" class="fr-select" :value="limit" @change="emit('update:limit', +$event.target.value)">
        <option v-for="opt in [5, 15, 30, 50, 100]" :key="opt" :value="opt">
          {{ opt }}
        </option>
      </select>
    </div>

    <div class="footer-item pagination-centered">
      <DsfrPagination :current-page="page" :pages="pages" @update:current-page="emit('update:page', $event)" />
    </div>

    <div class="footer-item total-count">{{ totalFiltered }} application(s) trouvée(s)</div>
  </div>
</template>

<style scoped>
.footer-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.pagination-centered {
  flex-grow: 1;
  justify-content: center;
}

.total-count {
  font-size: 0.875rem;
  color: #444;
}
</style>
