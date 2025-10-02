<script setup lang="ts">
import { onMounted, ref, computed, watch } from "vue";
import { useMetadataStore } from "@/stores/metadataStore";
import { formatDate } from "@/composables/use-date";
import PaginationFooter from "@/components/PaginationFooter.vue";

const headers = [
  "Application",
  "Auteur",
  "Organisation",
  "Type",
  "Date",
  "Description",
];

const selection = ref<string[]>([]);
const currentPage = ref(0);
const pageSize = ref(15);
const sortBy = ref("createdAt");
const sortOrder = ref<"asc" | "desc">("desc");
const createdAtGte = ref<string>("");
const createdAtLte = ref<string>("");

const metadataStore = useMetadataStore();

const isLoading = computed(() => metadataStore.isLoading);
const totalItems = computed(() => metadataStore.total);

const pages = computed(() => {
  const totalPages = Math.ceil(totalItems.value / pageSize.value);
  return Array.from({ length: totalPages }).map((_, i) => ({
    label: String(i + 1),
    title: `Page ${i + 1}`,
    href: `#page-${i + 1}`,
  }));
});

watch([currentPage, pageSize], () => {
  fetchData();
});

function convertLocalToUTC(localDateTimeString: string): string {
  if (!localDateTimeString) return "";
  const localDate = new Date(localDateTimeString);
  return localDate.toISOString();
}

function fetchData() {
  const filters: any = {
    page: currentPage.value,
    pageSize: pageSize.value,
    sortBy: sortBy.value,
    order: sortOrder.value,
  };

  if (createdAtGte.value) {
    filters.createdAtGte = convertLocalToUTC(createdAtGte.value);
  }

  if (createdAtLte.value) {
    filters.createdAtLte = convertLocalToUTC(createdAtLte.value);
  }

  return metadataStore.fetchMetadatasGlobal(filters);
}

async function applyFilters() {
  currentPage.value = 0;
  await fetchData();
}

function clearFilters() {
  createdAtGte.value = "";
  createdAtLte.value = "";
  sortBy.value = "createdAt";
  sortOrder.value = "desc";
  applyFilters();
}

// Pagination handlers
function handlePageChange(newPage: number) {
  currentPage.value = newPage;
}

function handlePageSizeChange(newPageSize: number) {
  pageSize.value = newPageSize;
  currentPage.value = 0;
}

// Sorting options
const sortOptions = [
  { value: "", text: "-- Aucun tri --" },
  { value: "createdAt", text: "Date" },
  { value: "application.label", text: "Application" },
  { value: "createdBy.email", text: "Auteur" },
  { value: "createdBy.organization.label", text: "Organisation" },
  { value: "action", text: "Type" },
];

onMounted(async () => {
  await fetchData();
});

function formatDescription(description: string): { title: string, content: string } {
  const title = description.split("\n")[0];

  const newMatch = description.match(/Nouvelle\(s\) valeur\(s\):\s*(\{[\s\S]*?\})(?:\n|$)/);
  const oldMatch = description.match(/Ancienne\(s\) valeur\(s\):\s*(\{[\s\S]*?\})(?:\n|$)/);

  if (!newMatch && !oldMatch) {
    return { title, content: description };
  }

  try {
    const segments: { pos: number, label: string, obj: any }[] = [];

    if (newMatch) {
      segments.push({ pos: newMatch.index || 0, label: "Nouvelle(s) valeur(s):", obj: JSON.parse(newMatch[1]) });
    }
    if (oldMatch) {
      segments.push({ pos: oldMatch.index || 0, label: "Ancienne(s) valeur(s):", obj: JSON.parse(oldMatch[1]) });
    }

    segments.sort((a, b) => a.pos - b.pos);

    const content = segments
      .map(seg =>
        `${seg.label
        } ${
          Object.entries(seg.obj)
            .map(([k, v]) => `${k}='${Array.isArray(v) ? v.join(", ") : (typeof v === "object" && v !== null ? JSON.stringify(v) : v)}'`)
            .join(" ")}`,
      )
      .join("\n");

    return { title, content };
  } catch {
    return { title, content: description };
  }
}

const metadataTableRows = computed(() =>
  metadataStore.metadatas.map((meta) => {
    const { title: descTitle, content } = formatDescription(meta.description || "");

    return {
      id: meta.id,
      Application: {
        id: meta.id,
        label: meta.application?.label ?? "Application inconnue",
        to: meta.applicationId
          ? { name: "application", params: { id: meta.applicationId } }
          : undefined,
      },
      Auteur: meta.createdBy?.email ?? "Inconnu",
      Organisation: (meta.createdBy as any)?.organization?.label ?? "-",
      Type: {
        id: meta.id,
        component: "DsfrTag",
        label: meta.action,
        class: meta.action,
      },
      Date: formatDate(meta.createdAt),
      Description: {
        id: meta.id,
        title: descTitle,
        content,
      },
    };
  }),
);
</script>

<template>
  <div class="fr-container--fluid fr-px-2w">
    <h1>Modifications</h1>

    <!-- Filters and Sorting form -->
    <form class="fr-mb-4w" @submit.prevent="applyFilters">
      <h3>Filtres et tri</h3>

      <!-- Date filters -->
      <div class="fr-grid-row fr-grid-row--gutters fr-mb-3w">
        <div class="fr-col-12 fr-col-md-4">
          <DsfrInput
            v-model="createdAtGte"
            label="Date de début"
            label-visible
            type="datetime-local"
            data-testid="history-filter-date-from"
          />
        </div>
        <div class="fr-col-12 fr-col-md-4">
          <DsfrInput
            v-model="createdAtLte"
            label="Date de fin"
            label-visible
            type="datetime-local"
            data-testid="history-filter-date-to"
          />
        </div>
      </div>

      <!-- Sorting controls -->
      <div class="fr-grid-row fr-grid-row--gutters fr-mb-3w">
        <div class="fr-col-12 fr-col-md-4">
          <DsfrSelect
            v-model="sortBy"
            label="Trier par"
            :options="sortOptions"
            data-testid="history-sort-select"
          />
        </div>
        <div class="fr-col-12 fr-col-md-4">
          <DsfrSelect
            v-model="sortOrder"
            label="Ordre"
            :options="[
              { value: '', text: '-- Aucun ordre --' },
              { value: 'desc', text: 'Décroissant' },
              { value: 'asc', text: 'Croissant' },
            ]"
            data-testid="history-sort-order-select"
          />
        </div>
      </div>

      <!-- Action buttons -->
      <div class="fr-btns-group fr-btns-group--inline">
        <DsfrButton
          type="submit"
          label="Appliquer"
          :disabled="isLoading"
          data-testid="history-apply-filters"
        />
        <DsfrButton
          type="button"
          secondary
          label="Effacer"
          :disabled="isLoading"
          data-testid="history-clear-filters"
          @click="clearFilters"
        />
      </div>
    </form>

    <div v-if="isLoading" class="fr-mb-3w">
      <AppLoader data-testid="history-loader" />
    </div>

    <div v-else-if="metadataTableRows.length === 0" class="text-center fr-mb-3w" data-testid="history-empty">
      <p>Aucune donnée recensée.</p>
    </div>

    <div v-else>
      <DsfrDataTable
        v-model:selection="selection"
        :headers-row="headers"
        :rows="metadataTableRows"
        row-key="id"
        :pagination="false"
        title="Données"
        data-testid="history-table"
      >
        <template #cell="{ colKey, cell }">
          <template v-if="colKey === 'Description'">
            <DsfrAccordion :id="`meta-${(cell as any).id}`" :title="(cell as any).title" data-testid="history-description-accordion">
              <div class="formatted-description" data-testid="history-description-content">
                {{ (cell as any).content }}
              </div>
            </DsfrAccordion>
          </template>
          <template v-else-if="colKey === 'Application'">
            <template v-if="cell && (cell as any).to">
              <router-link :to="(cell as any).to" :data-testid="`history-row-${(cell as any).id}-application`">
                {{ (cell as any).label }}
              </router-link>
            </template>
            <template v-else>
              <span :data-testid="`history-row-${(cell as any).id}-application`">{{ (cell as any).label }}</span>
            </template>
          </template>
          <template v-else-if="colKey === 'Type'">
            <DsfrTag :class="(cell as any).class" :label="(cell as any).label" :data-testid="`history-row-${(cell as any).id}-type`" />
          </template>
          <template v-else>
            {{ cell }}
          </template>
        </template>
      </DsfrDataTable>

      <!-- Pagination -->
      <PaginationFooter
        :total-filtered="totalItems"
        :pages="pages"
        :limit="pageSize"
        :page="currentPage"
        data-testid="history-pagination-footer"
        @update:limit="handlePageSizeChange"
        @update:page="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped>
.add { background-color: #e6f8ea; color: #1aa779; }
.update { background-color: #f8f3e6; color: #a7791a; }
.delete { background-color: #f8e6e6; color: #a71a1a; }

.formatted-description {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
</style>
