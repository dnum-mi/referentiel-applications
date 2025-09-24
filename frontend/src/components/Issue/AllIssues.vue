<script setup lang="ts">
import { onMounted, computed, ref } from "vue";
import { routeNames } from "@/router/route-names";

import { formatDate } from "@/composables/use-date";
import { statusDictionary, statusIconClasses } from "@/composables/use-dictionary";
import type { ReportIssue } from "@/models/ReportIssue";
import { useReportIssueStore } from "@/stores/reportIssueStore";

const title = "Liste de toutes les corrections d'applications";
const headers = ["Application", "Signalant", "Description", "Date", "Statut"];
type Status = "in_pending" | "in_progress" | "done";

const selection = ref<string[]>([]);
const currentPage = ref(0);

const reportStore = useReportIssueStore();

const isLoading = computed(() => reportStore.isLoading);

const rows = computed(() =>
  (reportStore.allReports || []).map((report: ReportIssue) => ({
    id: report.id,
    Application: {
      // id ici sert uniquement pour le data-testid unique par ligne
      id: report.id,
      label: report.application?.label,
      to: report.application?.id
        ? { name: routeNames.PROFILEAPP, params: { id: report.application.id } }
        : undefined,
    },
    Signalant: report.notifier?.email || "Inconnu",
    Description: report.description,
    Date: formatDate(report.createdAt),
    Statut: {
      id: report.id,
      component: "DsfrTag",
      icon: statusIconClasses[report.status as Status],
      label: statusDictionary[report.status as Status],
      class: report.status,
    },
  })),
);

onMounted(async () => {
  await reportStore.fetchAllReports();
});
</script>

<template>
  <div class="fr-container fr-my-2v w-[800px]">
    <AppLoader v-if="isLoading" data-testid="issues-loader" />
    <div v-else-if="!rows.length" class="text-center" data-testid="issues-empty">
      <p>Aucune correction recensée.</p>
    </div>
    <DsfrDataTable
      v-else
      v-model:selection="selection"
      v-model:current-page="currentPage"
      data-testid="issues-table"
      :headers-row="headers"
      :rows="rows"
      selectable-rows
      row-key="id"
      :title="title"
      pagination
      :rows-per-page="10"
      :pagination-options="[10, 20, 30]"
      bottom-action-bar-class="bottom-action-bar-class"
      pagination-wrapper-class="pagination-wrapper-class"
      sorted="id"
      :sortable-rows="['id']"
    >
      <template #cell="{ colKey, cell }">
        <template v-if="colKey === 'Application'">
          <template v-if="cell && cell.to && cell.to.params && cell.to.params.id">
            <router-link :to="cell.to" :data-testid="`issues-row-${cell.id}-application`">
              {{ cell.label || 'Voir l’application' }}
            </router-link>
          </template>
          <template v-else>
            <span :data-testid="`issues-row-${cell.id}-application`">{{ cell.label || 'Signalement global' }}</span>
          </template>
        </template>
        <template v-else-if="colKey === 'Statut'">
          <DsfrTag :icon="cell.icon" :class="cell.class" :label="cell.label" :data-testid="`issues-row-${cell.id}-status`" />
        </template>
        <template v-else>
          {{ cell }}
        </template>
      </template>
    </DsfrDataTable>
  </div>
</template>
