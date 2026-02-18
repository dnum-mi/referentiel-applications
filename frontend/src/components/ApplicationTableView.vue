<script setup lang="ts">
import { computed, ref } from "vue";
import { useApplicationSearch } from "@/composables/use-application-search";
import { useColumnPreferences } from "@/composables/use-column-preferences";
import { formatDateFR } from "@/composables/use-date";
import { homologationStatusDict, restartPrioritiesConfig, statusApplicationDictionary } from "@/composables/use-dictionary";
import RefAppTable from "./RefAppTable.vue";
import type { TableSortEvent } from "@/types/table";
import type { ApplicationStatus } from "@/client/types.gen.js";

const { filters, results, total, page, pageSize, setFilter, isLoading } = useApplicationSearch();
const { tableColumns, setColumnWidth } = useColumnPreferences();

// Calcul essentiel pour PrimeVue : (Page 0 -> 0, Page 1 -> 15, Page 2 -> 30...)
const firstIndex = computed(() => page.value * pageSize.value);

const sortField = ref(filters.value.sortBy || "label");
const sortOrder = ref(filters.value.order === "desc" ? -1 : 1);

const formatActors = (actors: any[], actorTypeCode: string): string => {
  if (!actors || actors.length === 0) return "-";

  const filteredActors = actors.filter((actor) => actor.actorType?.code === actorTypeCode);

  if (filteredActors.length === 0) return "-";

  return filteredActors
    .map((actor) => {
      let name = "";
      if (actor.organization) {
        name = actor.organization.sigle || actor.organization.path || "";
      }

      if (!name) {
        const fullName = [actor.firstname, actor.lastname].filter(Boolean).join(" ").trim();
        name = fullName || actor.email || "Acteur sans nom";
      }

      const email = actor.email && !name.includes(actor.email) ? ` (${actor.email})` : "";
      return `${name}${email}`;
    })
    .join("\n");
};

const getComplianceField = (compliance: any | undefined, field: string): string => {
  if (!compliance) return "-";

  switch (field) {
    case "dima":
      return compliance.dima_duration_hours !== null && compliance.dima_duration_hours !== undefined
        ? `${compliance.dima_duration_hours}h`
        : "-";
    case "pdma":
      return compliance.pdma_duration_hours !== null && compliance.pdma_duration_hours !== undefined
        ? `${compliance.pdma_duration_hours}h`
        : "-";
    case "rgaa":
      return compliance.rgaa_score_percentage !== null && compliance.rgaa_score_percentage !== undefined
        ? `${compliance.rgaa_score_percentage}%`
        : "-";
    case "dsfr":
      return compliance.dsfr_implemented !== null && compliance.dsfr_implemented !== undefined
        ? compliance.dsfr_implemented
          ? "Oui"
          : "Non"
        : "-";
    case "homologation":
      return compliance.homologation_status
        ? homologationStatusDict[compliance.homologation_status as keyof typeof homologationStatusDict] || compliance.homologation_status
        : "-";
    case "homologationDateEnd":
      return compliance.homologation_date_end ? formatDateFR(compliance.homologation_date_end) : "-";
    default:
      return "-";
  }
};

const applications = computed(() =>
  results.value.map((app: any) => {
    return {
      ...app,
      qualityDisplay: app.quality !== null ? `${app.quality}%` : "0%",
      hostingDisplay: app.hostings?.map((h: any) => h.hostingOption?.site || h.site).join(", ") || "-",
      tagsDisplay: app.tags?.map((tag: any) => tag.name).join(", ") || "-",
      priorityConfig: app.priorityRestart ? restartPrioritiesConfig[app.priorityRestart as keyof typeof restartPrioritiesConfig] : null,
      moaDisplay: formatActors(app.actors, "MOA"),
      moeDisplay: formatActors(app.actors, "MOE"),
      hostingManagerDisplay: formatActors(app.actors, "HEB"),
      rsimmDisplay: formatActors(app.actors, "RSSI"),
      dimaDisplay: getComplianceField(app.compliance, "dima"),
      pdmaDisplay: getComplianceField(app.compliance, "pdma"),
      rgaaDisplay: getComplianceField(app.compliance, "rgaa"),
      dsfrDisplay: getComplianceField(app.compliance, "dsfr"),
      homologationDisplay: getComplianceField(app.compliance, "homologation"),
      homologationDateEndDisplay: getComplianceField(app.compliance, "homologationDateEnd"),
      statusDisplay: app.currentStatus?.status
        ? statusApplicationDictionary[app.currentStatus.status as ApplicationStatus] || app.currentStatus.status
        : "-",
    };
  }),
);

function onSort(event: TableSortEvent) {
  sortField.value = event.sortField || "label";
  sortOrder.value = event.sortOrder || 1;

  setFilter({
    sortBy: sortField.value,
    order: sortOrder.value === -1 ? "desc" : "asc",
    page: 0,
  });
}

function onPage(event: any) {
  setFilter({
    page: event.page,
    pageSize: event.rows,
  });
}

function onColumnResize(event: { field: string; width: string }) {
  setColumnWidth(event.field, event.width);
}
</script>

<template>
  <RefAppTable
    :items="applications"
    :columns="tableColumns"
    :loading="isLoading"
    :lazy="true"
    :paginator="true"
    :total-records="total"
    :sort-field="sortField"
    :sort-order="sortOrder"
    :rows="pageSize"
    :first="firstIndex"
    data-test-id="application-table"
    @sort="onSort"
    @page="onPage"
    @column-resize="onColumnResize"
  >
    <template #body-quality="{ data }">
      {{ data.qualityDisplay }}
    </template>

    <template #body-label="{ data }">
      <router-link :to="{ name: 'application', params: { id: data.id } }">
        {{ data.label }}
      </router-link>
    </template>

    <template #body-priorityRestart="{ data }">
      <DsfrBadge v-if="data.priorityConfig" :label="data.priorityConfig.shortLabel" :type="data.priorityConfig.type" />
      <span v-else>-</span>
    </template>

    <template #body-hostingSite="{ data }">
      {{ data.hostingDisplay }}
    </template>

    <template #body-tag="{ data }">
      {{ data.tagsDisplay }}
    </template>

    <template #body-moa="{ data }">
      <span class="multiline-cell">{{ data.moaDisplay }}</span>
    </template>

    <template #body-moe="{ data }">
      <span class="multiline-cell">{{ data.moeDisplay }}</span>
    </template>

    <template #body-hostingManager="{ data }">
      <span class="multiline-cell">{{ data.hostingManagerDisplay }}</span>
    </template>

    <template #body-rsimm="{ data }">
      <span class="multiline-cell">{{ data.rsimmDisplay }}</span>
    </template>

    <template #body-dima="{ data }">
      {{ data.dimaDisplay }}
    </template>

    <template #body-pdma="{ data }">
      {{ data.pdmaDisplay }}
    </template>

    <template #body-rgaa="{ data }">
      {{ data.rgaaDisplay }}
    </template>

    <template #body-dsfr="{ data }">
      {{ data.dsfrDisplay }}
    </template>

    <template #body-homologation="{ data }">
      {{ data.homologationDisplay }}
    </template>

    <template #body-homologationDateEnd="{ data }">
      {{ data.homologationDateEndDisplay }}
    </template>

    <template #body-status="{ data }">
      {{ data.statusDisplay }}
    </template>

    <template #body-applicationViews="{ data }">
      {{ data.applicationViews }}
    </template>
  </RefAppTable>
</template>

<style scoped>
.truncate {
  display: inline-block;
  max-width: 80vh;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.multiline-cell {
  white-space: pre-line;
  display: block;
}
</style>
