<script setup lang="ts">
import Issues from "@/api/reportIssue";
import { onMounted, ref } from "vue";
import { routeNames } from "@/router/route-names";
import { formatDate } from "@/composables/use-date";
import { statusDictionary, statusIconClasses } from "@/composables/use-dictionary";

const title = "Liste de tous les signalements";
const headers = ["Application", "Signalant", "Description", "Date", "Statut"];

const rows = ref<(string | { component: string; [k: string]: unknown })[][]>([]);
const selection = ref<string[]>([]);
const currentPage = ref<number>(0);

const dataLoaded = ref(false);
const isLoading = ref(true);

const skeletonRows = ref<Array<Array<any>>>(
  Array(5).fill([{ label: " ", to: "#" }, " ", " ", { component: "DsfrTag", label: " ", class: "skeleton-tag" }]),
);

const loadReports = async () => {
  const reportList = await Issues.getReportIssue();

  rows.value = reportList.map((report: any) => [
    {
      label: report.application?.label,
      to: { name: routeNames.PROFILEAPP, params: { id: report.application?.id } },
    },
    report.notifier?.email,
    report.description,
    formatDate(report.createdAt),
    {
      component: "DsfrTag",
      icon: statusIconClasses[report.status],
      label: statusDictionary[report.status],
      class: report.status,
    },
  ]);
};

onMounted(() => {
  loadReports();
});
</script>

<template>
  <div class="fr-container fr-my-2v w-[800px]">
    <div v-if="dataLoaded && rows.length === 0" class="text-center">
      <p>Aucun signalement recensé.</p>
    </div>
    <DsfrDataTable
      v-else
      v-model:selection="selection"
      v-model:current-page="currentPage"
      :headers-row="headers"
      :rows="isLoading ? skeletonRows : rows"
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
        <template v-if="isLoading">
          <div class="skeleton-cell"></div>
        </template>
        <template v-else-if="colKey === 'Application'">
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

.skeleton-cell {
  height: 20px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 4px;
}

.skeleton-tag {
  display: inline-block;
  width: 60px;
  height: 20px;
  background: #e0e0e0;
  border-radius: 4px;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
