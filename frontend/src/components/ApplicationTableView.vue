<script setup lang="ts">
import { computed, watch, ref } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { restartPrioritiesConfig } from "@/composables/use-dictionary";
import PaginationFooter from "./PaginationFooter.vue";
import ExportApi from "@/api/export";
import { useUserStore } from "@/stores/userStore";
import { AdminLevel } from "@/models/user";

const searchStore = useApplicationSearchStore();
const userStore = useUserStore();

const sortBy = ref(searchStore.filters.sortBy || "label");
const sortedDesc = ref(searchStore.filters.order === "desc");

const lastValidColumn = ref(sortBy.value);

const columnToFieldMap: Record<string, string> = {
  IQ: "quality",
  Nom: "label",
  Priorité: "priorityRestart",
  Hébergement: "hostingSite",
  Tags: "tag",
};

const pages = computed(() => {
  const totalPages = Math.ceil(searchStore.total / searchStore.limit);
  return Array.from({ length: totalPages }).map((_, i) => ({
    label: String(i + 1),
    title: `Page ${i + 1}`,
    href: `#page-${i + 1}`,
  }));
});

watch(
  [sortBy, sortedDesc],
  ([col, desc]) => {
    let actualColumn = col;
    if (!col) {
      actualColumn = lastValidColumn.value;
      sortBy.value = actualColumn;
    } else {
      lastValidColumn.value = col;
    }

    const sortField = columnToFieldMap[actualColumn] || actualColumn;
    const orderValue = desc === true ? "desc" : "asc";

    searchStore.setFilter("sortBy", sortField);
    searchStore.setFilter("order", orderValue);
    searchStore.setFilter("page", 0);
    searchStore.searchApplications();
  },
  {
    flush: "post",
  },
);

const rows = computed(() =>
  searchStore.results.map((app: any) => ({
    IQ: { value: app.quality !== null ? `${app.quality}%` : "0%" },
    Nom: app,
    Priorité: app,
    Hébergement: {
      hosting:
        app.hostings
          ?.map((h: any) => {
            const site = h.hostingOption?.site || h.site || "";
            const building = h.hostingOption?.building || "";
            const room = h.hostingOption?.room || "";

            const parts = [site, building, room].filter(Boolean);
            return parts.length ? parts.join(" - ") : "-";
          })
          .join(", ") || "-",
    },
    Tags: {
      tags: app.tags?.join(", ") || "-",
    },
  })),
);

async function exportSearchResults() {
  try {
    await ExportApi.downloadCsv(searchStore.filters);
  } catch (error) {
    console.error("Export error:", error);
    alert("Une erreur est survenue lors de l'exportation CSV. Veuillez réessayer.");
  }
}

async function exportToExcel() {
  try {
    await ExportApi.downloadExcel(searchStore.filters);
  } catch (error) {
    console.error("Excel export error:", error);
    alert("Une erreur est survenue lors de l'exportation Excel. Veuillez réessayer.");
  }
}
</script>

<template>
  <div class="flex justify-between mb-4">
    <div class="export-button">
      <DsfrButton
        v-if="userStore.adminLevel >= AdminLevel.ADMIN"
        label="Exporter en CSV"
        icon="ri-download-line"
        @click="exportSearchResults"
        secondary
        icon-only-size="sm"
        class="fr-mr-2w"
      />
      <DsfrButton
        v-if="userStore.adminLevel >= AdminLevel.ADMIN"
        label="Exporter en Excel"
        icon="ri-file-excel-2-line"
        @click="exportToExcel"
        secondary
        icon-only-size="sm"
      />
    </div>
  </div>
  <DsfrDataTable
    :headers-row="['IQ', 'Nom', 'Priorité', 'Hébergement', 'Tags']"
    :rows="rows"
    sortable-rows
    vertical-borders
    :pagination="false"
    v-model:sortedBy="sortBy"
    v-model:sortedDesc="sortedDesc"
  >
    <template #cell="{ colKey, cell }">
      <template v-if="colKey === 'Nom'">
        <router-link :to="{ name: 'application', params: { id: cell.id } }" class="truncate">
          {{ cell.label }}
        </router-link>
      </template>

      <template v-else-if="colKey === 'Priorité'">
        <DsfrBadge
          v-if="cell.priorityRestart"
          :label="restartPrioritiesConfig[cell.priorityRestart].shortLabel"
          :type="restartPrioritiesConfig[cell.priorityRestart].type"
          :title="restartPrioritiesConfig[cell.priorityRestart].tooltip"
        />
        <span v-else>-</span>
      </template>

      <template v-else>
        <span class="truncate">{{ Object.values(cell)[0] }}</span>
      </template>
    </template>
  </DsfrDataTable>

  <PaginationFooter
    :totalFiltered="searchStore.total"
    :pages="pages"
    :limit="searchStore.limit"
    :page="searchStore.page"
    @update:limit="searchStore.limit = $event"
    @update:page="searchStore.page = $event"
  />
</template>

<style scoped>
.truncate {
  display: inline-block;
  max-width: 80vh;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.export-button {
  margin-bottom: 10px;
}
</style>
