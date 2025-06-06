<script setup lang="ts">
import { useReportIssueStore } from "@/stores/reportIssueStore";
import { computed, onMounted } from "vue";
import type { Application, Metadata } from "@/models/Application";

const props = defineProps<{ application: Application }>();

const reportStore = useReportIssueStore();

onMounted(() => {
  reportStore.fetchIssueByApplication(props.application.id);
});

const headers = ["Date", "Auteur", "Description"];
const currentPage = ref(0);
const activeAccordion = ref<number>();

const rows = computed(() => {
  const reports = (reportStore.issues || []).map((report: any) => ({
    sortKey: new Date(report.createdAt).getTime(),
    Date: new Date(report.createdAt).toLocaleDateString("fr-FR"),
    Auteur: report.notifier.email,
    Description: { content: "Signalement : \n" + report.description || "" },
  }));

  const modifications = (props.application.metadatas || []).map((metadata: Metadata) => ({
    sortKey: new Date(metadata.createdAt).getTime(),
    Date: new Date(metadata.createdAt).toLocaleDateString("fr-FR"),
    Auteur: metadata.createdBy?.email || "Inconnu",
    Description: { content: metadata.description || "" },
  }));

  return [...reports, ...modifications].sort((a, b) => b.sortKey - a.sortKey).map((item, index) => ({ ...item, index }));
});

const loading = computed(() => reportStore.isLoading);
</script>

<template>
  <AppLoader v-if="loading" />
  <div v-else-if="!loading && rows.length === 0" class="text-center">
    <p>Aucune correction proposée.</p>
  </div>

  <DsfrAccordionsGroup v-else v-model="activeAccordion">
    <DsfrDataTable
      v-model:current-page="currentPage"
      :headers-row="headers"
      :rows="rows"
      title="Liste des corrections et modifications"
      pagination
      :rows-per-page="5"
      :pagination-options="[5, 10, 20, 30]"
    >
      <template #cell="{ colKey, cell }">
        <template v-if="colKey === 'Description'">
          <DsfrAccordion :id="cell.index" :title="cell.content.slice(0, 60) + (cell.content.length > 60 ? '...' : '')">
            <div class="full-description">
              {{ cell.content }}
            </div>
          </DsfrAccordion>
        </template>

        <template v-else>
          {{ cell }}
        </template>
      </template>
    </DsfrDataTable>
  </DsfrAccordionsGroup>
  <ReportIssue :application="application" />
</template>

<style scoped>
.full-description {
  white-space: pre-wrap;
  word-wrap: break-word;
  margin-top: 0.5rem;
}
</style>
