<script setup lang="ts">
import api from "@/api";
import { Permission, type PaginatedReportDto, type ReportDto } from "@/client/types.gen";
import type { ApplicationWithPerms } from "@/models/Application";
import { useToasterStore } from "@/stores/toasterStore";
import { useUserStore } from "@/stores/userStore";
import type { TableColumn } from "@/types/table";
import { computed, onMounted, ref, watch } from "vue";
import RefAppTable from "./RefAppTable.vue";

const props = defineProps<{ application: ApplicationWithPerms }>();

const toaster = useToasterStore();
const userStore = useUserStore();

const issues = ref<PaginatedReportDto>({ results: [], total: 0 });
const isLoading = ref(false);
const currentPage = ref(0);
const pageSize = ref(5);
const firstIndex = computed(() => currentPage.value * pageSize.value);

const tableColumns: TableColumn[] = [
  { field: "Date", header: "Date", sortable: false },
  { field: "Auteur", header: "Auteur", sortable: false },
  { field: "Titre", header: "Titre", sortable: false },
  { field: "Description", header: "Description", sortable: false },
];

const canPost = computed(() => {
  return userStore.hasPermissions([Permission.REPORT_POST], Array.from(props.application.myPerms));
});

async function fetchIssues() {
  isLoading.value = true;
  try {
    const query = {
      page: currentPage.value,
      limit: pageSize.value,
    };
    const response = await api.applicationReportsControllerFindAll({
      path: { applicationId: props.application.id },
      query,
    });
    if (!response.data) {
      issues.value = { results: [], total: 0 };
      return;
    }
    issues.value = response.data;
  } finally {
    isLoading.value = false;
  }
}

watch([currentPage, pageSize], fetchIssues);
onMounted(fetchIssues);

function onPage(event: any) {
  currentPage.value = event.page;
  pageSize.value = event.rows;
}

const reportText = ref("");
const submitting = ref(false);

async function submitReport() {
  try {
    submitting.value = true;
    const applicationId = props.application?.id;
    if (!applicationId) throw new Error("Application ID is undefined");

    await api.applicationReportsControllerCreate({ path: { applicationId }, body: { applicationId, description: reportText.value } });
    await fetchIssues();

    reportText.value = "";
    toaster.addSuccessMessage("Votre proposition sera prise en compte prochainement.");
  } catch (_error) {
    toaster.addErrorMessage("Oops ! Une erreur est survenue, contactez l’administrateur du référentiel si le problème persiste.");
  } finally {
    submitting.value = false;
  }
}

const reportRows = computed(() => {
  const title = "Signalement";
  return issues.value.results
    .map((report: ReportDto) => ({
      sortKey: new Date(report.createdAt).getTime(),
      Date: new Date(report.createdAt).toLocaleDateString("fr-FR"),
      Auteur: report.notifier?.email || "Inconnu",
      Titre: title,
      Description: report.description,
    }))
    .sort((a, b) => b.sortKey - a.sortKey)
    .map((item, index) => ({ ...item, index }));
});

const loading = computed(() => isLoading.value);
</script>

<template>
  <AppLoader v-if="loading" data-testid="reports-loader" />
  <div v-else>
    <RefAppTable
      :items="reportRows"
      :columns="tableColumns"
      :paginator="true"
      :lazy="true"
      :rows="pageSize"
      :first="firstIndex"
      :total-records="issues.total"
      data-testid="reports-table"
      empty-message="Aucun signalement proposé."
      @page="onPage"
    >
    </RefAppTable>
  </div>
  <div v-if="canPost" data-testid="reports-report-issue">
    <h4>Proposer un signalement</h4>
    <DsfrInput
      v-model="reportText"
      is-textarea
      label="Décrivez votre signalement"
      label-visible
      placeholder="Décrivez votre signalement..."
      required
      class="fr-mb-1w"
      rows="2"
      data-testid="report-issue-textarea"
    />
    <DsfrButton :disabled="!reportText || submitting" data-testid="report-issue-submit-btn" @click="submitReport">
      Envoyer mon signalement
    </DsfrButton>
  </div>
</template>
