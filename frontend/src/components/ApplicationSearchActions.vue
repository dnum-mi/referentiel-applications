<script setup lang="ts">
import { ref } from "vue";
import type { Ref } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/userStore";
import { useApplicationStore } from "@/stores/applicationStore";
import { useApplicationSearch } from "@/composables/use-application-search";
import { useToasterStore } from "@/stores/toasterStore";
import { routeNames } from "@/router/route-names";
import ReportModal from "@/components/modal/ReportModal.vue";
import CreateQualityCampaignModal from "@/components/modal/CreateQualityCampaignModal.vue";
import ColumnCustomization from "@/components/ColumnCustomization.vue";
import { Permission } from "@/client";

const router = useRouter();
const userStore = useUserStore();
const applicationStore = useApplicationStore();
const { filters } = useApplicationSearch();
const toaster = useToasterStore();

const isReportMissingOpen = ref(false);
const isCreateCampaignOpen = ref(false);

const reportStatusMessage = ref("");

let lastFocusedElement: Element | null = null;

function createModalHandlers(isOpen: Ref<boolean>) {
  const open = () => {
    lastFocusedElement = document.activeElement;
    isOpen.value = true;
  };
  const close = () => {
    isOpen.value = false;
    if (lastFocusedElement instanceof HTMLElement) {
      lastFocusedElement.focus();
    }
  };
  return { open, close };
}

const { open: openReport, close: closeReport } = createModalHandlers(isReportMissingOpen);
const { open: openCreateCampaign, close: closeCreateCampaign } = createModalHandlers(isCreateCampaignOpen);

async function exportToExcel() {
  try {
    await applicationStore.downloadExcel(filters.value);
  } catch (error) {
    console.error("Erreur lors de l'exportation Excel", error);
    toaster.addErrorMessage("Une erreur est survenue lors de l'exportation Excel. Veuillez réessayer.");
  }
}

const hasExportPermissions = computed(() => {
  return userStore.hasPermissions([Permission.DATA_EXPORT]);
});

const hasCreateApplicationsPermissions = computed(() => {
  return userStore.hasPermissions([Permission.CREATE_APPLICATION]);
});

const hasCreateGlobalReport = computed(() => {
  return userStore.hasPermissions([Permission.CREATE_GLOBAL_REPORT]);
});

// #2446/#2608 : seule la capacité dédiée QualityCampaignManage ouvre la gestion des campagnes —
// ni AdminPanelManage ni GlobalAdminManage ne l'accordent. Elle n'est jamais accordée par défaut,
// même à un administrateur global : un administrateur de périmètre comme global ne l'obtient que
// par délégation explicite (couche 2). Sans ce garde-fou, un bouton actif pourrait déclencher une
// action rejetée (403) par le backend, qui n'exige que QualityCampaignManage
// (quality-campaign.controller.ts).
const hasQualityCampaignPermissions = computed(() => {
  return userStore.hasPermissions([Permission.QUALITY_CAMPAIGN_MANAGE]);
});
</script>

<template>
  <div class="fr-container-fluid" data-testid="application-search-actions">
    <output aria-live="polite" class="sr-only">{{ reportStatusMessage }}</output>

    <div class="actions">
      <DsfrButton
        secondary
        icon="fr-icon-add-line"
        type="button"
        :disabled="!hasCreateApplicationsPermissions"
        data-testid="create-application-btn"
        class="action-btn icon-left"
        @click="router.push({ name: routeNames.CREATEAPP })"
        title="Créer une application"
      >
        Créer une application
      </DsfrButton>

      <DsfrButton
        secondary
        icon="fr-icon-alert-line"
        aria-haspopup="dialog"
        aria-controls="modal-report-missing"
        type="button"
        :disabled="!hasCreateGlobalReport"
        data-testid="report-missing-app"
        class="action-btn icon-left report-btn"
        @click="openReport"
        title="Signalement général (pour signaler une application manquante de façon globale)"
        aria-label="Signaler une application manquante (signalement général)"
        :aria-expanded="isReportMissingOpen ? 'true' : 'false'"
      >
        Faire un signalement
      </DsfrButton>

      <DsfrButton
        v-if="hasExportPermissions"
        label="Exporter en Excel"
        icon="ri-file-excel-2-line"
        secondary
        data-testid="application-export-btn"
        class="action-btn icon-left hide-on-mobile"
        @click="exportToExcel"
        aria-label="Exporter en Excel les applications correspondant aux filtres actuels"
        title="Exporter en excel les applications correspondant aux filtres actuels"
      ></DsfrButton>

      <DsfrButton
        v-if="hasExportPermissions"
        label="Exporter en Excel"
        icon="ri-file-excel-2-line"
        secondary
        data-testid="application-export-btn-mobile"
        class="action-btn icon-left show-on-mobile"
        @click="exportToExcel"
        aria-label="Exporter en Excel les applications correspondant aux filtres actuels"
        title="Exporter en excel les applications correspondant aux filtres actuels"
      ></DsfrButton>

      <DsfrButton
        label="Créer une campagne qualité"
        icon="ri-mail-send-line"
        secondary
        :disabled="!hasQualityCampaignPermissions"
        data-testid="create-quality-campaign-btn"
        class="action-btn icon-left"
        @click="openCreateCampaign"
        title="Créer une campagne de mise en qualité à partir des filtres actuels"
        aria-label="Créer une campagne de mise en qualité à partir des filtres actuels"
      ></DsfrButton>

      <ColumnCustomization data-testid="column-customization" />
    </div>
  </div>

  <ReportModal
    id="modal-report-missing"
    :opened="isReportMissingOpen"
    context="global"
    @close="closeReport"
    @status="(s: string) => (reportStatusMessage = s)"
    @busy="(b: boolean) => (reportStatusMessage = b ? 'En cours...' : '')"
  ></ReportModal>

  <CreateQualityCampaignModal :opened="isCreateCampaignOpen" @close="closeCreateCampaign" />
</template>

<style scoped>
.sr-only {
  position: absolute !important;
  height: 1px;
  width: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap;
  border: 0;
  padding: 0;
  margin: -1px;
}

.actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

.action-btn {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  padding-left: 0.85rem;
  padding-right: 0.85rem;
  white-space: normal;
  text-align: center;
  line-height: 1.2;
}

.action-btn.icon-left ::v-deep(.fr-btn__icon),
.action-btn.icon-left ::v-deep(.fr-icon),
.action-btn.icon-left ::v-deep("[class*='ri-']"),
.action-btn.icon-left ::v-deep("[class*='icon-']") {
  order: -1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
  line-height: 1;
  height: 1em;
}

.hide-on-mobile {
  display: inline-flex;
}
.show-on-mobile {
  display: none;
}

@media (max-width: 420px) {
  .actions {
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    gap: 0.45rem;
  }

  .action-btn {
    width: 100%;
    min-height: 48px;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    font-size: 15px;
  }

  .hide-on-mobile {
    display: none !important;
  }
  .show-on-mobile {
    display: inline-flex !important;
  }
}

@media (max-width: 340px) {
  .actions {
    gap: 0.3rem;
  }
  .action-btn {
    padding-left: 0.6rem;
    padding-right: 0.6rem;
  }
}
</style>
