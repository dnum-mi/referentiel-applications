<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";

const props = defineProps<{
  totalFiltered: number;
  limit: number;
  page: number;
}>();

const emit = defineEmits<{
  (e: "update:limit", value: number): void;
  (e: "update:page", value: number): void;
}>();

const pages = computed(() => {
  const totalPages = Math.max(1, Math.ceil(props.totalFiltered / props.limit));
  return Array.from({ length: totalPages }).map((_, index) => ({
    label: String(index + 1),
    title: `Page ${index + 1}`,
    href: `#page-${index + 1}`,
  }));
});

// RGAA-032 : DsfrPagination ne restitue le `title` que sur la page courante. On pose
// un intitulé explicite « Page N » (aria-label) sur chaque lien numéroté, à l'init et
// à chaque re-rendu (changement de page / de nombre de pages).
const paginationRoot = ref<HTMLElement>();
function labelPaginationLinks() {
  paginationRoot.value?.querySelectorAll<HTMLAnchorElement>("a.fr-pagination__link").forEach((link) => {
    const text = link.textContent?.trim() ?? "";
    if (/^\d+$/.test(text)) {
      link.setAttribute("aria-label", `Page ${text}`);
    }
  });
}
onMounted(labelPaginationLinks);
watch([() => props.page, () => props.totalFiltered, () => props.limit], () => nextTick(labelPaginationLinks), {
  flush: "post",
});
</script>

<template>
  <div class="footer-bar" data-testid="pagination-footer">
    <div class="footer-item">
      <label for="rows-per-page" class="fr-label">Résultats par page</label>
      <select
        id="rows-per-page"
        class="fr-select"
        :value="limit"
        data-testid="pagination-rows-select"
        @change="emit('update:limit', +($event.target as HTMLSelectElement).value)"
      >
        <option v-for="opt in [5, 15, 30, 50, 100]" :key="opt" :value="opt">
          {{ opt }}
        </option>
      </select>
    </div>

    <nav ref="paginationRoot" class="footer-item pagination-centered" role="navigation" aria-label="Pagination">
      <DsfrPagination
        :current-page="page"
        :pages="pages"
        first-page-title="Aller à la première page"
        prev-page-title="Page précédente"
        next-page-title="Page suivante"
        last-page-title="Aller à la dernière page"
        data-testid="pagination-component"
        @update:current-page="emit('update:page', $event)"
      />
    </nav>

    <p class="footer-item total-count" data-testid="pagination-total-count">{{ totalFiltered }} résultat(s)</p>
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

/* Le compteur est désormais un <p> (RGAA-028/031) : neutraliser ses marges par défaut. */
.total-count {
  margin: 0;
}
</style>
