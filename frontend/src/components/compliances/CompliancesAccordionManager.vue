<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Permission, type ComplianceDto } from "@/client/types.gen";
import api from "@/api/index.js";
import { applicationCompliancesControllerScanEcoIndex } from "@/client/sdk.gen";
import { useToasterStore } from "@/stores/toasterStore";
import ComplianceForm from "./ComplianceForm.vue";
import {
  testResultsDict,
  backupStorageDict,
  homologationStatusDict,
  complianceFieldLabels,
  type ComplianceType,
} from "@/constants/dictionary";
import { formatDate, formatDateFR } from "@/composables/use-date";
import { useMediaQuery } from "@vueuse/core";
import { BREAKPOINTS } from "@/constants/breakpoint";
import RefAppTable from "@/components/RefAppTable.vue";
import type { TableColumn } from "@/types/table";
import { useUserStore } from "@/stores/userStore";
import type { ApplicationWithPerms } from "@/models/Application";
import RgaaComplianceSection from "./RgaaComplianceSection.vue";
import { getEcoIndexGrade } from "@/utils/get-ecoindex-grade.js";

const props = defineProps<{ application: ApplicationWithPerms }>();
const applicationId = props.application.id;

const toaster = useToasterStore();
const userStore = useUserStore();
// « rgaa » a sa propre section dédiée ; « pra » est un critère booléen sans
// formulaire détaillé : ni l'un ni l'autre n'est géré dans cet accordéon.
type ManagedComplianceType = Exclude<ComplianceType, "rgaa" | "pra">;
const compliance = ref<ComplianceDto | null>(null);
const isLoading = ref(false);
const isScanningEcoIndex = ref(false);

const showModal = ref(false);
const modalMode = ref<"create" | "edit">("create");
const selectedType = ref<ManagedComplianceType | null>(null);

const showDetailsModal = ref(false);
const detailsTitle = ref("");
const detailsList = ref<{ key: string; label: string; value: string }[]>([]);

const isMobile = useMediaQuery(`(max-width: ${BREAKPOINTS.SMALL_CARD_MAX}px)`);

const types: ManagedComplianceType[] = ["dima", "pdma", "homologation", "rgpd", "eco_index", "dsfr"];
const labels: Record<ManagedComplianceType, string> = {
  dima: "Délai d'Indisponibilité Maximale Admissible (DIMA)",
  pdma: "Perte de données maximale admissible (PDMA)",
  homologation: "Homologation",
  dsfr: "Design Système de l'état (DSFR)",
  rgpd: "Règlement Général sur la Protection des Données (RGPD)",
  eco_index: "Ecoconception",
};
const fieldsByType: Record<ManagedComplianceType, string[]> = {
  dima: [
    "duration_hours",
    "is_hno",
    "business_impact",
    "recovery_plan",
    "recovery_solutions",
    "recovery_manager",
    "last_test_date",
    "test_result",
  ],
  pdma: [
    "duration_hours",
    "data_types",
    "backup_frequency",
    "backup_storage",
    "last_test_date",
    "test_result",
    "backup_method",
    "restoration_manager",
  ],
  homologation: ["status", "date_end"],
  dsfr: ["implemented", "version"],
  rgpd: ["has_aipd", "dpo_name"],
  eco_index: ["score", "ges", "water", "target_url", "last_calculated_at"],
};
const tableColumns: TableColumn[] = [
  { field: "Type", header: "Type", sortable: false },
  { field: "Statut", header: "Statut", sortable: false },
  { field: "Résumé", header: "Résumé", sortable: false },
  { field: "Actions", header: "Actions", sortable: false },
];

const NO_INFO_LABEL = "Pas d'information disponible";
const FILLED_STATUS_LABEL = "Renseignée";
const EMPTY_STATUS_LABEL = "Non renseignée";
const NO_ECOINDEX_LABEL = "Non calculé";

function getFieldValue(type: ManagedComplianceType, key: string) {
  return (compliance.value as any)?.[`${type}_${key}`];
}

function hasComplianceInfo(type: ManagedComplianceType): boolean {
  return fieldsByType[type].some((key) => {
    const value = getFieldValue(type, key);
    return value != null && value !== "";
  });
}

const typesWithData = computed(() => types.filter(hasComplianceInfo));

const isNewType = computed(() => {
  return selectedType.value != null && !typesWithData.value.includes(selectedType.value);
});

function getPreview(type: ManagedComplianceType): string {
  if (!compliance.value) return "";

  if (type === "dima") {
    const parts: string[] = [];
    if (compliance.value.dima_duration_hours != null) parts.push(`${compliance.value.dima_duration_hours}H`);
    parts.push(compliance.value.dima_is_hno ? "Heure non ouvrée" : "Heure ouvrée");
    return parts.join(" • ");
  }

  if (type === "pdma") {
    return `${compliance.value.pdma_duration_hours ?? ""}H`.trim();
  }

  if (type === "homologation") {
    const parts: string[] = [];
    if (compliance.value.homologation_status) {
      parts.push(homologationStatusDict[compliance.value.homologation_status] ?? compliance.value.homologation_status);
    }
    if (compliance.value.homologation_date_end) parts.push(formatDateFR(compliance.value.homologation_date_end));
    return parts.join(" - ");
  }

  if (type === "dsfr") {
    const parts: string[] = [];
    if (compliance.value.dsfr_implemented === true) parts.push("Implémenté");
    else if (compliance.value.dsfr_implemented === false) parts.push("Non implémenté");
    if (compliance.value.dsfr_version) parts.push(`Version ${compliance.value.dsfr_version}`);
    return parts.join(" • ");
  }

  if (type === "eco_index") {
    const score = compliance.value.eco_index_score;
    const date = compliance.value.eco_index_last_calculated_at;
    if (score == null) return NO_ECOINDEX_LABEL;
    const datePart = date ? ` • Le ${formatDateFR(date)}` : "";
    return `Score: ${getEcoIndexGrade(score)} (${score}/100) ${datePart}`;
  }

  const parts: string[] = [];
  if (compliance.value.rgpd_has_aipd === true) parts.push("AIPD: Oui");
  else if (compliance.value.rgpd_has_aipd === false) parts.push("AIPD: Non");
  if (compliance.value.rgpd_dpo_name) parts.push(`DPO: ${compliance.value.rgpd_dpo_name}`);
  return parts.join(" • ");
}

function formatFieldValue(key: string, value: unknown): string {
  if (key === "last_calculated_at") return formatDate(String(value));
  if (key === "test_result") return testResultsDict[value as keyof typeof testResultsDict];
  if (key === "backup_storage") return backupStorageDict[value as keyof typeof backupStorageDict];
  if (key === "status") return homologationStatusDict[value as keyof typeof homologationStatusDict] ?? String(value);
  if (key === "is_hno" || key === "recovery_plan" || key === "implemented" || key === "has_aipd") return value ? "Oui" : "Non";
  if (key === "last_test_date" || key === "date_end" || key === "audit_date") return formatDateFR(value as string | Date);
  if (key === "score") return `${getEcoIndexGrade(value as number)} (${String(value)}/100)`;
  return String(value);
}

const complianceRows = computed(() =>
  types.map((type) => {
    const label = labels[type];
    const hasInfo = hasComplianceInfo(type);
    const preview = hasInfo ? getPreview(type) || NO_INFO_LABEL : NO_INFO_LABEL;

    return {
      type,
      label,
      hasInfo,
      status: hasInfo ? FILLED_STATUS_LABEL : EMPTY_STATUS_LABEL,
      preview,
    };
  }),
);

const filledComplianceRows = computed(() => complianceRows.value.filter(({ hasInfo }) => hasInfo));

const typeOptions = computed(() =>
  types.map((type) => ({ value: type, text: labels[type], disabled: typesWithData.value.includes(type) })),
);

const modalTitle = computed(() => {
  if (!selectedType.value) return "Sélectionner un type de conformité";
  return isNewType.value ? `Créer ${labels[selectedType.value]}` : `Modifier ${labels[selectedType.value]}`;
});

async function fetchCompliance() {
  try {
    isLoading.value = true;
    const response = await api.applicationCompliancesControllerFindOne({ path: { applicationId } });
    compliance.value = response.data ?? null;
  } catch {
    toaster.addErrorMessage("Erreur lors de la récupération des conformités.");
  } finally {
    isLoading.value = false;
  }
}

async function refresh() {
  await fetchCompliance();
  selectedType.value = null;
  showModal.value = false;
}

onMounted(refresh);

function onEditClick(type: ManagedComplianceType) {
  modalMode.value = "edit";
  selectedType.value = type;
  showModal.value = true;
}

function onSaved(updatedCompliance: ComplianceDto) {
  compliance.value = updatedCompliance;
  selectedType.value = null;
  showModal.value = false;
}

function closeModal() {
  showModal.value = false;
  selectedType.value = null;
}

async function runEcoIndexScan() {
  try {
    isScanningEcoIndex.value = true;
    const response = await applicationCompliancesControllerScanEcoIndex({
      path: { applicationId },
    });
    const error = response.error as Error;
    if (error) {
      toaster.addErrorMessage("Aucune URL cible EcoIndex valide trouvée.");
      return;
    }
    compliance.value = response.data ?? compliance.value;
    toaster.addSuccessMessage("Scan EcoIndex effectué avec succès.");
  } catch {
    toaster.addErrorMessage("Erreur lors du scan EcoIndex.");
  } finally {
    isScanningEcoIndex.value = false;
  }
}

function openDetails(type: ManagedComplianceType) {
  detailsList.value = fieldsByType[type]
    .map((key) => ({ key, value: getFieldValue(type, key) }))
    .filter(({ value }) => value != null && value !== "")
    .map(({ key, value }) => ({
      key,
      label: complianceFieldLabels[key] || key,
      value: formatFieldValue(key, value),
    }));
  detailsTitle.value = labels[type];
  showDetailsModal.value = true;
}

function closeDetails() {
  showDetailsModal.value = false;
  detailsList.value = [];
  detailsTitle.value = "";
}

const hasComplianceEditPermission = computed(() => {
  const hasGlobalComplianceWritePermission = userStore.hasPermissions([Permission.COMPLIANCE_WRITE], Array.from(props.application.myPerms));
  const hasApplicationComplianceWritePermission = props.application.myPerms?.has(Permission.COMPLIANCE_WRITE) ?? false;

  return hasGlobalComplianceWritePermission || hasApplicationComplianceWritePermission;
});
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-justify-content-between fr-mb-3w" data-testid="compliance-header">
    <div class="fr-col">
      <h3 class="fr-mb-0">Gestion des conformités</h3>
    </div>
  </div>

  <AppLoader v-if="isLoading" data-testid="compliance-loader"></AppLoader>

  <div v-else>
    <div v-if="isMobile && typesWithData.length === 0" class="fr-mb-2w" data-testid="compliance-empty">
      <p>Aucune conformité renseignée pour cette application.</p>
    </div>

    <div v-if="!isMobile">
      <RefAppTable :items="complianceRows" :columns="tableColumns" data-testid="compliance-table">
        <template #body-Type="{ data }">
          <strong>{{ data.label }}</strong>
        </template>

        <template #body-Statut="{ data }">
          <span>{{ data.status }}</span>
        </template>

        <template #body-Résumé="{ data }">
          <DsfrTag :label="data.preview"></DsfrTag>
        </template>

        <template #body-Actions="{ data }">
          <div class="fr-btns-group">
            <DsfrButton
              size="sm"
              tertiary
              icon="ri-eye-line"
              data-testid="compliance-view-btn"
              @click="() => openDetails(data.type)"
              title="Voir les détails"
              aria-label="Voir les détails"
            >
              Voir
            </DsfrButton>

            <DsfrButton
              size="sm"
              tertiary
              icon="ri-edit-line"
              data-testid="compliance-edit-btn"
              :disabled="!hasComplianceEditPermission"
              @click="() => onEditClick(data.type)"
              title="Modifier"
              aria-label="Modifier"
            >
              Modifier
            </DsfrButton>
            <DsfrButton
              v-if="data.type === 'eco_index'"
              icon="ri-leaf-line"
              size="sm"
              tertiary
              :disabled="isLoading || isScanningEcoIndex || !hasComplianceEditPermission"
              data-testid="compliance-scan-ecoindex-btn"
              @click="runEcoIndexScan"
            >
              Calculer
            </DsfrButton>
          </div>
        </template>
      </RefAppTable>
    </div>

    <div v-else class="compliance-cards" data-testid="compliance-cards">
      <div
        v-for="row in filledComplianceRows"
        :key="row.type"
        class="compliance-card"
        role="group"
        :data-testid="`compliance-card-${row.type}`"
      >
        <div class="fr-card">
          <div class="fr-card__body">
            <div class="fr-card__content">
              <h3 class="fr-card__title">
                {{ row.label }}
              </h3>

              <p class="fr-card__desc">
                {{ row.preview }}
              </p>

              <div v-if="row.preview" class="fr-card__end">
                <DsfrTag :label="row.preview"></DsfrTag>
              </div>
            </div>

            <div class="fr-card__footer">
              <ul class="fr-btns-group fr-btns-group--inline-reverse">
                <li>
                  <DsfrButton size="sm" tertiary icon="ri-eye-line" :aria-label="`Voir ${row.label}`" @click="() => openDetails(row.type)">
                    Voir
                  </DsfrButton>
                </li>
                <li>
                  <DsfrButton
                    size="sm"
                    tertiary
                    icon="ri-edit-line"
                    :aria-label="`Modifier ${row.label}`"
                    @click="() => onEditClick(row.type)"
                  >
                    Modifier
                  </DsfrButton>
                </li>
                <li>
                  <DsfrButton
                    v-if="row.type === 'eco_index'"
                    icon="ri-leaf-line"
                    size="sm"
                    tertiary
                    :disabled="isLoading || isScanningEcoIndex"
                    data-testid="compliance-scan-ecoindex-btn"
                    @click="runEcoIndexScan"
                  >
                    Calculer
                  </DsfrButton>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <RgaaComplianceSection :application-id="applicationId" :app-perms="application.myPerms" class="fr-mt-4w" />
  </div>

  <DsfrModal :opened="showDetailsModal" :title="detailsTitle" data-testid="compliance-details-modal" @close="closeDetails">
    <div class="fr-mb-2w" data-testid="compliance-details-content">
      <template v-if="detailsList.length">
        <ul class="compliance-details-modal-list">
          <li v-for="item in detailsList" :key="item.key">
            <strong>{{ item.label }}:</strong>
            <span class="compliance-value"> {{ item.value }}</span>
          </li>
        </ul>
      </template>
      <template v-else>
        <p>Aucune donnée à afficher.</p>
      </template>
    </div>
    <template #footer>
      <DsfrButton secondary label="Fermer" @click="closeDetails"></DsfrButton>
    </template>
  </DsfrModal>

  <DsfrModal :opened="showModal" data-testid="compliance-modal" :title="modalTitle" @close="closeModal">
    <template #default>
      <div v-if="!selectedType" class="fr-mb-2w">
        <DsfrSelect
          v-model="selectedType"
          data-testid="compliance-type-select"
          :options="typeOptions"
          label="Type de conformité"
          label-visible
          default-unselected-text="Sélectionner un type"
        ></DsfrSelect>
      </div>

      <ComplianceForm
        v-if="selectedType"
        data-testid="compliance-form-container"
        :application="application"
        :application-id="applicationId"
        :type="selectedType"
        :mode="modalMode"
        :initial-data="compliance"
        @saved="onSaved"
      ></ComplianceForm>
    </template>

    <template #footer>
      <DsfrButton type="button" label="Annuler" secondary data-testid="compliance-cancel-btn" @click="closeModal"></DsfrButton>
    </template>
  </DsfrModal>
</template>

<style scoped>
.compliance-cards {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

@media (max-width: 599px) {
  .compliance-cards {
    grid-template-columns: 1fr;
  }
}

.compliance-card {
  min-height: 140px;
}

.compliance-details-modal-list {
  margin: 0;
  padding-left: 1rem;
  list-style: none;
}
.compliance-details-modal-list li {
  margin-bottom: 0.5rem;
}

.compliance-value {
  margin-left: 0.5rem;
  color: inherit;
  word-break: break-word;
}

.compliance-card ::v-deep(.fr-card__footer) {
  position: relative;
  z-index: 2;
}
</style>
