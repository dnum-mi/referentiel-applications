<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useToasterStore } from "@/stores/toasterStore";
import api from "@/api";
import type { AnomalyNotificationDto, AnomalyNotificationPaginatedResponseDto, MetadataDto } from "@/client/types.gen";
import type { ApplicationWithPerms } from "@/models/Application";
import { useUserStore } from "@/stores/userStore";
import { AdminLevel } from "@/models/user";
import { useMetadataStore } from "@/stores/metadataStore";
import { useRoute } from "vue-router";
import RefAppTable from "./RefAppTable.vue";
import type { TableColumn } from "@/types/table";

const route = useRoute();
const props = defineProps<{ application: ApplicationWithPerms }>();

const metadataStore = useMetadataStore();
const toaster = useToasterStore();

const issues = ref<AnomalyNotificationPaginatedResponseDto>({ results: [], total: 0 });
const isLoading = ref(false);
const currentPage = ref(0);
const pageSize = ref(5);
const firstIndex = computed(() => currentPage.value * pageSize.value);

const tableColumns: TableColumn[] = [
  { field: "Date", header: "Date", sortable: false },
  { field: "Auteur", header: "Auteur", sortable: false },
  { field: "Titre", header: "Titre", sortable: false },
  { field: "Actions", header: "Actions", sortable: false },
];

const activeAccordion = ref<number>();
const userStore = useUserStore();

const canPost = computed(() => {
  return props.application.myPerms.has("postAnomalyNotifications") || userStore.adminLevel >= AdminLevel.WRITE;
});

async function fetchIssues() {
  isLoading.value = true;
  try {
    const query = {
      page: currentPage.value,
      limit: pageSize.value,
    };
    const response = await api.applicationAnomalyNotificationsControllerFindAll({
      path: { applicationId: props.application.id },
      query,
    });
    issues.value = response.data as AnomalyNotificationPaginatedResponseDto;
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

const correctionText = ref("");
const submitting = ref(false);

async function submitCorrection() {
  try {
    submitting.value = true;
    const applicationId = props.application?.id;
    if (!applicationId) throw new Error("Application ID is undefined");

    await api.anomalyNotificationsControllerCreate({ body: { applicationId, description: correctionText.value } });
    await fetchIssues();

    correctionText.value = "";
    toaster.addSuccessMessage("Votre proposition sera prise en compte prochainement.");
  } catch (_error) {
    toaster.addErrorMessage("Oops ! Une erreur est survenue, contactez l’administrateur du référentiel si le problème persiste.");
  } finally {
    submitting.value = false;
  }
}

function getTitle(meta: any): string {
  return (meta.description || "").split("\n")[0];
}

const rows = computed(() => {
  const title = "Signalement";
  const reports = issues.value.results.map((report: AnomalyNotificationDto) => ({
    sortKey: new Date(report.createdAt).getTime(),
    Date: new Date(report.createdAt).toLocaleDateString("fr-FR"),
    Auteur: report.notifier?.email || "Inconnu",
    Titre: title,
    Actions: {
      id: report.id,
      isMetadata: false,
    },
  }));

  const modifications = (metadataStore.metadatas || []).map((metadata: MetadataDto) => {
    return {
      sortKey: new Date(metadata.createdAt).getTime(),
      Date: new Date(metadata.createdAt).toLocaleDateString("fr-FR"),
      Auteur: metadata.createdBy?.email || "Inconnu",
      Titre: getTitle(metadata),
      Actions: {
        id: metadata.id,
        isMetadata: true,
      },
    };
  });

  return [...reports, ...modifications].sort((a, b) => b.sortKey - a.sortKey).map((item, index) => ({ ...item, index }));
});

const loading = computed(() => isLoading.value || metadataStore.isLoading);
</script>

<template>
  <AppLoader v-if="loading" data-testid="notifications-loader" />
  <div v-else-if="!loading && rows.length === 0" class="text-center" data-testid="notifications-empty">
    <p>Aucune correction proposée.</p>
  </div>

  <DsfrAccordionsGroup v-else v-model="activeAccordion">
    <RefAppTable
      :items="rows"
      :columns="tableColumns"
      :paginator="true"
      :lazy="true"
      :rows="pageSize"
      :first="firstIndex"
      :total-records="issues.total"
      data-testid="notifications-table"
      @page="onPage"
    >
      <template #body-Actions="{ data }">
        <router-link
          v-if="data.Actions.isMetadata"
          :to="{ name: 'metadata-detail', params: { id: data.Actions.id }, query: { from: route.fullPath } }"
          class="fr-btn fr-btn--secondary fr-btn--sm"
          data-testid="notifications-see-more-button"
        >
          Voir plus
        </router-link>
        <span v-else></span
        ><!-- for Actions without any metadata -->
      </template>
    </RefAppTable>
  </DsfrAccordionsGroup>
  <div v-if="canPost" data-testid="notifications-report-issue">
    <h4>Proposer une correction</h4>
    <DsfrInput
      v-model="correctionText"
      is-textarea
      placeholder="Écrivez votre correction..."
      required
      class="fr-mb-1w"
      rows="2"
      data-testid="report-issue-textarea"
    />
    <DsfrButton :disabled="!correctionText || submitting" data-testid="report-issue-submit-btn" @click="submitCorrection">
      Proposer ma correction
    </DsfrButton>
  </div>
</template>
