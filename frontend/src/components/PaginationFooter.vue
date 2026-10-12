<script setup lang="ts">
import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { computed, useId } from "vue";

const props = defineProps<{
  totalFiltered: number;
  limit: number;
  page: number;
  /** La table fournit déjà sa propre zone de navigation. */
  embedded?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:limit", value: number): void;
  (e: "update:page", value: number): void;
}>();

const rowsId = `rows-per-page-${useId()}`;
const pageSizeOptions = computed(() => [...new Set([...PAGE_SIZE_OPTIONS, props.limit])].filter((size) => size > 0).sort((a, b) => a - b));
const pageCount = computed(() => (props.limit > 0 ? Math.max(1, Math.ceil(props.totalFiltered / props.limit)) : 1));
const currentPage = computed(() => Math.max(0, Math.min(props.page, pageCount.value - 1)));
const pageNumbers = computed(() => {
  const start = Math.max(0, Math.min(currentPage.value - 2, pageCount.value - 5));
  const numbers = new Set([0, pageCount.value - 1]);
  for (let index = start; index < Math.min(start + 5, pageCount.value); index++) numbers.add(index);
  return [...numbers].sort((a, b) => a - b);
});

function changePage(page: number) {
  if (page >= 0 && page < pageCount.value && page !== currentPage.value) emit("update:page", page);
}

function pageLabel(label: string, destination: number) {
  return `${label} (page ${destination + 1} sur ${pageCount.value})`;
}
</script>

<template>
  <div class="footer-bar" data-testid="pagination-footer">
    <div class="footer-item">
      <label :for="rowsId" class="fr-label">Résultats par page</label>
      <select
        :id="rowsId"
        class="fr-select"
        :value="limit"
        data-testid="pagination-rows-select"
        @change="emit('update:limit', +($event.target as HTMLSelectElement).value)"
      >
        <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">
          {{ opt }}
        </option>
      </select>
    </div>

    <component
      :is="embedded ? 'div' : 'nav'"
      class="footer-item fr-pagination"
      :aria-label="embedded ? undefined : 'Pagination'"
      data-testid="pagination-component"
    >
      <!-- Les quatre commandes restent montées et focalisables, y compris aux bornes. -->
      <ul class="fr-pagination__list">
        <li>
          <button
            type="button"
            class="fr-pagination__link fr-pagination__link--first"
            data-testid="pagination-first"
            :aria-label="pageLabel('Première page', 0)"
            :aria-disabled="currentPage === 0"
            @click="changePage(0)"
          >
            Première page
          </button>
        </li>
        <li>
          <button
            type="button"
            class="fr-pagination__link fr-pagination__link--prev"
            data-testid="pagination-prev"
            :aria-label="pageLabel('Page précédente', Math.max(0, currentPage - 1))"
            :aria-disabled="currentPage === 0"
            @click="changePage(currentPage - 1)"
          >
            Page précédente
          </button>
        </li>
        <template v-for="(number, index) in pageNumbers" :key="number">
          <li v-if="index > 0 && number > pageNumbers[index - 1] + 1" aria-hidden="true"><span class="fr-pagination__link">…</span></li>
          <li>
            <button
              type="button"
              class="fr-pagination__link"
              :aria-label="`Page ${number + 1} sur ${pageCount}`"
              :aria-current="number === currentPage ? 'page' : undefined"
              @click="changePage(number)"
            >
              {{ number + 1 }}
            </button>
          </li>
        </template>
        <li>
          <button
            type="button"
            class="fr-pagination__link fr-pagination__link--next"
            data-testid="pagination-next"
            :aria-label="pageLabel('Page suivante', Math.min(pageCount - 1, currentPage + 1))"
            :aria-disabled="currentPage === pageCount - 1"
            @click="changePage(currentPage + 1)"
          >
            Page suivante
          </button>
        </li>
        <li>
          <button
            type="button"
            class="fr-pagination__link fr-pagination__link--last"
            data-testid="pagination-last"
            :aria-label="pageLabel('Dernière page', pageCount - 1)"
            :aria-disabled="currentPage === pageCount - 1"
            @click="changePage(pageCount - 1)"
          >
            Dernière page
          </button>
        </li>
      </ul>
    </component>

    <p role="status" aria-live="polite" aria-atomic="true" class="fr-sr-only" data-testid="pagination-page-status">
      Page {{ currentPage + 1 }} sur {{ pageCount }}
    </p>

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

.fr-pagination__link[aria-disabled="true"] {
  color: var(--text-disabled-grey);
  cursor: not-allowed;
}
</style>
