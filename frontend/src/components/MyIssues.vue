<script setup lang="ts">
import Issues from "@/api/reportIssue";
import { onMounted, ref } from "vue";
import { routeNames } from "@/router/route-names";
import { formatDate } from "@/composables/use-date";
import { statusDictionary, statusIconClasses } from "@/composables/use-dictionary";

const title = "Liste de mes signalements";
const headers = ["Application", "Description", "Date", "Statut"];

const rows = ref<(string | { component: string; [k: string]: unknown })[][]>([]);
const selection = ref<string[]>([]);
const currentPage = ref<number>(0);

const loadReports = async () => {
  try {
    const reportList = await Issues.getReportIssueByNotifierId();

    rows.value = reportList.map((report: any) => [
      {
        label: report.application?.label,
        to: { name: routeNames.PROFILEAPP, params: { id: report.application?.id } },
      },
      report.description,
      formatDate(report.createdAt),
      {
        component: "DsfrTag",
        icon: statusIconClasses[report.status],
        label: statusDictionary[report.status],
        class: report.status,
      },
    ]);
  } catch (error) {
    if (error.response?.status === 404) {
      console.warn("Aucune notification trouvée.");
      return [];
    }
    console.error("Une erreur est survenue lors du chargement des signalements :", error);
    throw error;
  }
};

onMounted(() => {
  loadReports();
});
</script>

<template>
  <div class="fr-container fr-my-2v w-[800px]">
    <div v-if="rows.length === 0" class="text-center">
      <p>Aucun signalement recensé.</p>
    </div>
    <DsfrDataTable
      v-else
      v-model:selection="selection"
      v-model:current-page="currentPage"
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
          <router-link :to="cell.to">
            {{ cell.label }}
          </router-link>
        </template>
        <template v-else-if="colKey === 'Statut'">
          <DsfrTag :icon="cell.icon" :class="cell.class" :label="cell.label" />
        </template>
        <template v-else>
          {{ cell }}
        </template>
      </template>
    </DsfrDataTable>
  </div>
</template>

<style scoped>
:deep(.in_progress) {
  color: var(--info-425-625);
  background-color: var(--info-950-100);
}

:deep(.in_pending) {
  color: var(--error-425-625);
  background-color: var(--error-950-100);
}

:deep(.done) {
  color: var(--success-425-625);
  background-color: var(--success-950-100);
}
.text-center {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #555;
  font-size: 1.2rem;
  font-weight: 500;
  background-color: #f9f9f9;
  border: 1px dashed #ccc;
  border-radius: 8px;
  padding: 20px;
  margin: 20px auto;
  width: 80%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.text-center p {
  margin: 0;
  text-align: center;
}
</style>
