<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useApplicationSearch } from "@/composables/use-application-search";
import { restartPrioritiesConfig } from "@/composables/use-dictionary";
import PaginationFooter from "./PaginationFooter.vue";

const { filters, results, total, page, pageSize, setFilter, setOrder } = useApplicationSearch();

const sortBy = ref(filters.value.sortBy || "label");
const sortedDesc = ref(filters.value.order === "desc");

const columnToFieldMap: Record<string, string> = {
  IQ: "quality",
  Nom: "label",
  Priorité: "priorityRestart",
  Hébergement: "hostingSite",
  Tags: "tag",
};

watch([sortBy, sortedDesc], ([col, desc]) => {
  const sortField = columnToFieldMap[col || "label"] || col || "label";
  setFilter({ sortBy: sortField, order: desc ? "desc" : "asc" });
}, { flush: "post" });

const rows = computed(() =>
  results.value.map((app: any) => ({
    IQ: { value: app.quality !== null ? `${app.quality}%` : "0%" },
    Nom: app,
    Priorité: app,
    Hébergement: {
      hosting: app.hostings?.map((h: any) => {
        const parts = [h.hostingOption?.site || h.site, h.hostingOption?.building, h.hostingOption?.room].filter(Boolean);
        return parts.length ? parts.join(" - ") : "-";
      }).join(", ") || "-",
    },
    Tags: { tags: app.tags?.map((tag: any) => tag.name).join(", ") || "-" },
  })),
);
</script>

<template>
  <DsfrDataTable
    v-model:sorted-by="sortBy"
    v-model:sorted-desc="sortedDesc"
    title="Liste des applications"
    no-caption
    :headers-row="['IQ', 'Nom', 'Priorité', 'Hébergement', 'Tags']"
    :rows="rows"
    sortable-rows
    vertical-borders
    data-testid="application-table"
    @update:sorted-desc="setOrder"
  >
    <template #cell="{ colKey, cell }">
      <template v-if="colKey === 'Nom'">
        <router-link
          :to="{ name: 'application', params: { id: cell.id } }"
          class="truncate"
          :data-testid="`application-row-${cell.id}-link`"
        >
          {{ cell.label }}
        </router-link>
      </template>

      <template v-else-if="colKey === 'Priorité'">
        <DsfrBadge
          v-if="cell.priorityRestart"
          :label="restartPrioritiesConfig[cell.priorityRestart].shortLabel"
          :type="restartPrioritiesConfig[cell.priorityRestart].type"
          :title="restartPrioritiesConfig[cell.priorityRestart].tooltip"
          :data-testid="`application-row-${cell.id}-priority`"
        />
        <span v-else>-</span>
      </template>

      <template v-else>
        <span
          class="truncate"
          :data-testid="`application-row-${cell.id}-${colKey === 'Hébergement' ? 'hosting' : colKey === 'Tags' ? 'tags' : 'iq'}`"
        >
          {{ Object.values(cell)[0] }}
        </span>
      </template>
    </template>
  </DsfrDataTable>

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
.truncate {
  display: inline-block;
  max-width: 80vh;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
