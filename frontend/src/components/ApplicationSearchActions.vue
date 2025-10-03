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

function openCreateModal() {
  isCreateModalOpen.value = true;
}
function openReportModal() {
  isReportMissingOpen.value = true;
}
function closeCreateModal() {
  isCreateModalOpen.value = false;
}
function closeReportModal() {
  isReportMissingOpen.value = false;
}

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
  <div>
    <div class="button-container">
      <div class="fr-col-auto">
        <DsfrButton
          secondary
          icon="fr-icon-add-line"
          type="button"
          :disabled="userStore.adminLevel < AdminLevel.WRITE"
          data-testid="create-application-btn"
          @click="openCreateModal"
        >
          Créer une application
        </DsfrButton>
      </div>
      <div class="fr-col-auto">
        <DsfrButton
          secondary
          icon="fr-icon-alert-line"
          aria-haspopup="dialog"
          aria-controls="modal-report-missing"
          type="button"
          data-testid="report-missing-app"
          @click="openReportModal"
        >
          Signaler une application manquante
        </DsfrButton>
      </div>
      <div>
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

    <ReportAnomaly
      :opened="isReportMissingOpen"
      context="global"
      @close="closeReportModal"
    />

    <CreateApplicationModal
      :opened="isCreateModalOpen"
      @close="closeCreateModal"
    />
  </div>
</template>

<style scoped>
.button-container {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
</style>
