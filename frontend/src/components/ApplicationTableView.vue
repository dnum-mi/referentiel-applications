<script setup lang="ts">
import type { ApplicationStatus, BusinessDivisionDto, HostingOptionDto } from "@/client/types.gen.js";
import { useApplicationSearch } from "@/composables/use-application-search";
import { useColumnPreferences } from "@/composables/use-column-preferences";
import { formatDateFR } from "@/composables/use-date";
import { homologationStatusDict, restartPrioritiesConfig, statusApplicationDictionary } from "@/constants/dictionary";
import type { TableSortEvent } from "@/types/table";
import { computed, ref } from "vue";
import RefAppTable from "./RefAppTable.vue";

const { filters, results, total, page, pageSize, setFilter, isLoading } = useApplicationSearch();
const { tableColumns, setColumnWidth } = useColumnPreferences();

// Calcul essentiel pour PrimeVue : (Page 0 -> 0, Page 1 -> 15, Page 2 -> 30...)
const firstIndex = computed(() => page.value * pageSize.value);

const sortField = ref(filters.value.sortBy || "label");
const sortOrder = ref(filters.value.order === "desc" ? -1 : 1);

const formatActors = (actors: any[], actorTypeCode: string): string => {
  const filteredActors = actors.filter((actor) => actor.actorType?.code === actorTypeCode);

  if (filteredActors.length === 0) return "";

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

const formatBusinessDivision = (businessDivision?: BusinessDivisionDto): string => {
  if (!businessDivision) return "";
  return businessDivision.label;
};

const formatHours = (value: number | null | undefined): string => (value == null ? "" : `${value}h`);
const formatPercent = (value: number | null | undefined): string => (value == null ? "" : `${value}%`);
const formatBooleanText = (value: boolean | null | undefined): string => (value == null ? "" : value ? "Oui" : "Non");
const formatHomologation = (value: string | null | undefined): string =>
  value ? homologationStatusDict[value as keyof typeof homologationStatusDict] || value : "";
const formatDate = (value: string | null | undefined): string => (value ? formatDateFR(value) : "");
const formatStatus = (value: ApplicationStatus | null | undefined): string => (value ? statusApplicationDictionary[value] || value : "");
const formatHostingsProvider = (value: HostingOptionDto | undefined): string => (value ? value.provider : "");
const formatHostingsPlatform = (value: HostingOptionDto | undefined): string => (value ? value.platform : "");

const applications = computed(() =>
  results.value.map((app: any) => {
    return {
      ...app,
      qualityDisplay: `${app.quality}%`,
      hostingDisplay: app.hostings.map((h: any) => h.hostingOption?.site || h.site).join(", "),
      tagsDisplay: app.tags.map((tag: any) => tag.name).join(", "),
      hostingProviderDisplay: app.hostings.map((h: any) => formatHostingsProvider(h.hostingOption)).join(", "),
      hostingPlatformDisplay: app.hostings.map((h: any) => formatHostingsPlatform(h.hostingOption)).join(", "),
      priorityConfig: app.priorityRestart ? restartPrioritiesConfig[app.priorityRestart as keyof typeof restartPrioritiesConfig] : null,
      moaDisplay: formatActors(app.actors, "MOA"),
      moeDisplay: formatActors(app.actors, "MOE"),
      hostingManagerDisplay: formatActors(app.actors, "HEB"),
      businessDivisionDisplay: formatBusinessDivision(app.businessDivision),
      rsimmDisplay: formatActors(app.actors, "RSSI"),
      dimaDisplay: formatHours(app.compliance?.dima_duration_hours),
      pdmaDisplay: formatHours(app.compliance?.pdma_duration_hours),
      rgaaDisplay: formatPercent(app.compliance?.rgaa_score_percentage),
      dsfrDisplay: formatBooleanText(app.compliance?.dsfr_implemented),
      rgpdDisplay: formatBooleanText(app.compliance?.rgpd_has_aipd),
      praDisplay: formatBooleanText(app.compliance?.dima_recovery_plan),
      homologationDisplay: formatHomologation(app.compliance?.homologation_status),
      homologationDateEndDisplay: formatDate(app.compliance?.homologation_date_end),
      statusDisplay: formatStatus(app.currentStatus?.status),
      technicalMaturity: app.technicalDebtInfo?.technicalMaturity,
      businessMaturity: app.technicalDebtInfo?.businessMaturity,
      costMaturity: app.technicalDebtInfo?.costMaturity,
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
      <span v-else />
    </template>

    <template #body-hostingSite="{ data }">
      {{ data.hostingDisplay }}
    </template>

    <template #body-hosting-ProviderDisplay="{ data }">
      {{ data.hostingProviderDisplay }}
    </template>

    <template #body-hosting-PlatformDisplay="{ data }">
      {{ data.hostingPlatformDisplay }}
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

    <template #body-rgpd="{ data }">
      {{ data.rgpdDisplay }}
    </template>

    <template #body-pra="{ data }">
      {{ data.praDisplay }}
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

    <template #body-businessDivision="{ data }">
      <span class="multiline-cell">{{ data.businessDivisionDisplay }}</span>
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
