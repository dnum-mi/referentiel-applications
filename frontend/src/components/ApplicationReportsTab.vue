<script setup lang="ts">
import api from "@/api";
import { isApiSuccess } from "@/api/api-result";
import { Permission, type PaginatedReportDto, type ReportDto } from "@/client/types.gen";
import type { ApplicationWithPerms } from "@/models/Application";
import { useToasterStore } from "@/stores/toasterStore";
import type { TableColumn, TableSortEvent } from "@/types/table";
import type { DataTablePageEvent } from "primevue/datatable";
import { computed, nextTick, onMounted, ref } from "vue";
import RefAppTable from "./RefAppTable.vue";
import { useAppPermission } from "@/composables/use-app-permission";

defineOptions({ inheritAttrs: false });

const props = defineProps<{ application: ApplicationWithPerms }>();

const toaster = useToasterStore();

const issues = ref<PaginatedReportDto>({ results: [], total: 0 });
const isLoading = ref(false);
const loadError = ref("");
const currentPage = ref(0);
const pageSize = ref(5);
const firstIndex = computed(() => currentPage.value * pageSize.value);

const tableColumns: TableColumn[] = [
  { field: "Date", header: "Date", sortable: true },
  { field: "Auteur", header: "Auteur", sortable: true },
  { field: "Titre", header: "Titre", sortable: true },
  { field: "Description", header: "Description", sortable: true },
];

const canPost = useAppPermission(() => props.application.myPerms, [Permission.REPORT_POST]);

async function fetchIssues() {
  isLoading.value = true;
  loadError.value = "";
  try {
    const response = await api.applicationReportsControllerFindAll({
      path: { applicationId: props.application.id },
      query: { limit: 10000 },
    });
    if (!isApiSuccess(response) || !response.data) throw new Error("Reports unavailable");
    issues.value = response.data;
  } catch {
    loadError.value = "Erreur lors du chargement des signalements.";
  } finally {
    isLoading.value = false;
  }
}

onMounted(fetchIssues);

const sortField = ref("Date");
const sortOrder = ref<number>(-1);

function onSort(event: TableSortEvent) {
  sortField.value = event.sortField || "Date";
  sortOrder.value = event.sortOrder;
}

function onPage(event: DataTablePageEvent) {
  currentPage.value = event.page;
  pageSize.value = event.rows;
}

const reportText = ref("");
const submitting = ref(false);
const submissionError = ref("");
const reportForm = ref<HTMLDivElement | null>(null);

async function submitReport() {
  if (submitting.value || !reportText.value.trim()) return;
  submissionError.value = "";
  let saved = false;
  const submitButton = reportForm.value?.querySelector<HTMLButtonElement>('[data-testid="report-issue-submit-btn"]');
  try {
    submitting.value = true;
    const applicationId = props.application?.id;
    if (!applicationId) throw new Error("Application ID is undefined");

    const response = await api.applicationReportsControllerCreate({
      path: { applicationId },
      body: { applicationId, description: reportText.value },
    });
    if (!isApiSuccess(response)) throw new Error("Report creation failed");
    saved = true;
    await fetchIssues();

    reportText.value = "";
    toaster.addSuccessMessage("Votre proposition sera prise en compte prochainement.");
  } catch (error) {
    console.error("Erreur lors de l'envoi du signalement:", error);
    submissionError.value = "Erreur lors de l'envoi du signalement. Votre saisie est conservée ; vous pouvez réessayer.";
  } finally {
    submitting.value = false;
    if (saved && (document.activeElement === document.body || document.activeElement === submitButton)) {
      await nextTick();
      reportForm.value?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
    }
  }
}

const reportRows = computed(() => {
  const title = "Signalement";
  return issues.value.results.map((report: ReportDto) => ({
    Date: report.createdAt,
    dateDisplay: new Date(report.createdAt).toLocaleDateString("fr-FR"),
    // Signalement créé sous impersonation : afficher aussi l'admin réel (#2061).
    Auteur: report.impersonator?.email
      ? `${report.notifier?.email || "Inconnu"} (via ${report.impersonator.email})`
      : report.notifier?.email || "Inconnu",
    Titre: title,
    Description: report.description,
  }));
});

const loading = computed(() => isLoading.value);
</script>

<template>
  <div role="alert" aria-live="assertive" aria-atomic="true" data-testid="reports-load-error">
    <p v-if="loadError" class="fr-error-text">{{ loadError }}</p>
  </div>
  <AppLoader v-if="loading" data-testid="reports-loader" />
  <div v-else v-bind="$attrs">
    <RefAppTable
      v-if="!loadError"
      :items="reportRows"
      :columns="tableColumns"
      :paginator="true"
      :rows="pageSize"
      :first="firstIndex"
      :total-records="reportRows.length"
      :sort-field="sortField"
      :sort-order="sortOrder"
      data-testid="reports-table"
      empty-message="Aucun signalement proposé."
      @sort="onSort"
      @page="onPage"
    >
      <template #body-Date="{ data }">
        {{ data.dateDisplay }}
      </template>
    </RefAppTable>
  </div>
  <div v-if="canPost" ref="reportForm" data-testid="reports-report-issue">
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
    <div role="alert" aria-live="assertive" aria-atomic="true" data-testid="report-issue-error">
      <p v-if="submissionError" class="fr-error-text">{{ submissionError }}</p>
    </div>
    <DsfrButton
      :disabled="!reportText"
      :aria-disabled="submitting"
      :aria-busy="submitting"
      data-testid="report-issue-submit-btn"
      @click="submitReport"
    >
      {{ submitting ? "Envoi…" : "Envoyer mon signalement" }}
    </DsfrButton>
  </div>
</template>
