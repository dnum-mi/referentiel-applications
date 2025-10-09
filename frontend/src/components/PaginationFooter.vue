<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  totalFiltered: number
  limit: number
  page: number
}>();

const emit = defineEmits<{
  (e: "update:limit", value: number): void
  (e: "update:page", value: number): void
}>();

const pages = computed(() => {
  const totalPages = Math.max(1, Math.ceil(props.totalFiltered / props.limit));
  return Array.from({ length: totalPages }).map((_, index) => ({
    label: String(index + 1),
    title: `Page ${index + 1}`,
    href: `#page-${index + 1}`,
  }));
});
</script>

<template>
  <div class="footer-bar" data-testid="pagination-footer">
    <div class="footer-item">
      <label for="rows-per-page" class="fr-label">Résultats par page</label>
      <select id="rows-per-page" class="fr-select" :value="limit" data-testid="pagination-rows-select" @change="emit('update:limit', +$event.target.value)">
        <option v-for="opt in [5, 15, 30, 50, 100]" :key="opt" :value="opt">
          {{ opt }}
        </option>
      </select>
    </div>

    <div class="footer-item pagination-centered">
      <DsfrPagination :current-page="page" :pages="pages" data-testid="pagination-component" @update:current-page="emit('update:page', $event)" />
    </div>

    <div class="footer-item total-count" data-testid="pagination-total-count">
      {{ totalFiltered }} résultat(s)
    </div>
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
</style>
