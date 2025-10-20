<script setup lang="ts">
import { ref } from "vue";
import { useUserStore } from "@/stores/userStore";
import { useApplicationStore } from "@/stores/applicationStore";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { AdminLevel } from "@/models/user";
import ReportAnomaly from "@/components/modal/reportAnomaly.vue";
import CreateApplicationModal from "@/components/modal/CreateApplicationModal.vue";

const userStore = useUserStore();
const applicationStore = useApplicationStore();
const searchStore = useApplicationSearchStore();

const isReportMissingOpen = ref(false);
const isCreateModalOpen = ref(false);

async function exportToExcel() {
  try {
    await applicationStore.downloadExcel(searchStore.filters);
  } catch (error) {
    console.error("Excel export error:", error);
    alert("Une erreur est survenue lors de l'exportation Excel. Veuillez réessayer.");
  }
}
</script>

<template>
  <div class="fr-container-fluid" data-testid="application-search-actions">
    <div class="fr-grid-row fr-grid-row--right">
      <DsfrButton
        secondary
        icon="fr-icon-add-line"
        type="button"
        :disabled="userStore.adminLevel < AdminLevel.WRITE && !userStore.user?.capabilities?.includes('CreateApplication')"
        data-testid="create-application-btn"
        class="fr-mr-1v"
        @click="isCreateModalOpen = true"
      >
        Créer une application
      </DsfrButton>
      <DsfrButton
        secondary
        icon="fr-icon-alert-line"
        aria-haspopup="dialog"
        aria-controls="modal-report-missing"
        type="button"
        :disabled="!userStore.user?.capabilities?.includes('CreateGlobalAnomalyNotification') && userStore.adminLevel < AdminLevel.WRITE"
        data-testid="report-missing-app"
        class="fr-mr-1v"
        @click="isReportMissingOpen = true"
      >
        Signaler une application manquante
      </DsfrButton>
      <DsfrButton
        v-if="userStore.adminLevel >= AdminLevel.ADMIN"
        label="Exporter en Excel"
        icon="ri-file-excel-2-line"
        secondary
        icon-only-size="sm"
        data-testid="application-export-btn"
        @click="exportToExcel"
      />
    </div>
  </div>

  <ReportAnomaly :opened="isReportMissingOpen" context="global" @close="isReportMissingOpen = false" />

  <CreateApplicationModal :opened="isCreateModalOpen" @close="isCreateModalOpen = false" />
</template>
