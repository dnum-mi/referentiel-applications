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
} from "@/composables/use-dictionary";
import { formatDate, formatDateFR } from "@/composables/use-date";
import { useMediaQuery } from "@vueuse/core";
import { BREAKPOINTS } from "@/constants/breakpoint";
import RefAppTable from "@/components/RefAppTable.vue";
import type { TableColumn } from "@/types/table";
import { useUserStore } from "@/stores/userStore";
import type { ApplicationWithPerms } from "@/models/Application";
import RgaaComplianceSection from "./RgaaComplianceSection.vue";

const props = defineProps<{ application: ApplicationWithPerms }>();
const applicationId = props.application.id;

const toaster = useToasterStore();
const userStore = useUserStore();
type ManagedComplianceType = Exclude<ComplianceType, "rgaa">;
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

const types: ManagedComplianceType[] = ["dima", "pdma", "homologation", "dsfr", "rgpd"];
const labels: Record<ManagedComplianceType, string> = {
  dima: "Délai d'Indisponibilité Maximale Admissible (DIMA)",
  pdma: "Perte de données maximale admissible (PDMA)",
  homologation: "Homologation",
  dsfr: "Design Système de l'état (DSFR)",
  rgpd: "Règlement Général sur la Protection des Données (RGPD)",
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

  const parts: string[] = [];
  if (compliance.value.rgpd_has_aipd === true) parts.push("AIPD: Oui");
  else if (compliance.value.rgpd_has_aipd === false) parts.push("AIPD: Non");
  if (compliance.value.rgpd_dpo_name) parts.push(`DPO: ${compliance.value.rgpd_dpo_name}`);
  return parts.join(" • ");
}

function formatFieldValue(key: string, value: unknown): string {
  if (key === "test_result") return testResultsDict[value as keyof typeof testResultsDict];
  if (key === "backup_storage") return backupStorageDict[value as keyof typeof backupStorageDict];
  if (key === "status") return homologationStatusDict[value as keyof typeof homologationStatusDict] ?? String(value);
  if (key === "is_hno" || key === "recovery_plan" || key === "implemented" || key === "has_aipd") return value ? "Oui" : "Non";
  if (key === "last_test_date" || key === "date_end" || key === "audit_date") return formatDateFR(value as string | Date);
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

const ecoIndexValues = computed(() => ({
  score: compliance.value?.eco_index_score,
  ges: compliance.value?.eco_index_ges,
  water: compliance.value?.eco_index_water,
  targetUrl: compliance.value?.eco_index_target_url,
  lastCalculatedAt: compliance.value?.eco_index_last_calculated_at,
}));

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

function onAddClick() {
  modalMode.value = compliance.value && (compliance.value.id || typesWithData.value.length > 0) ? "edit" : "create";
  selectedType.value = null;
  showModal.value = true;
}

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
  const hasGlobalComplianceWritePermission = userStore.hasPermissions([Permission.COMPLIANCE_WRITE]);
  const hasApplicationComplianceWritePermission = props.application.myPerms?.has(Permission.COMPLIANCE_WRITE) ?? false;

  return hasGlobalComplianceWritePermission || hasApplicationComplianceWritePermission;
});

const isEditingTargetUrl = ref(false);
const targetUrlDraft = ref("");
const isSavingTargetUrl = ref(false);

function startEditTargetUrl() {
  targetUrlDraft.value = compliance.value?.eco_index_target_url ?? "";
  isEditingTargetUrl.value = true;
}

function cancelEditTargetUrl() {
  isEditingTargetUrl.value = false;
}

async function saveTargetUrl() {
  isSavingTargetUrl.value = true;
  try {
    const response = await api.applicationCompliancesControllerUpdate({
      path: { applicationId },
      body: { eco_index_target_url: targetUrlDraft.value === "" ? null : targetUrlDraft.value },
    });
    if (response.data) compliance.value = response.data;
    isEditingTargetUrl.value = false;
    toaster.addSuccessMessage("URL cible EcoIndex mise à jour.");
  } catch {
    toaster.addErrorMessage("Erreur lors de la mise à jour de l'URL cible EcoIndex.");
  } finally {
    isSavingTargetUrl.value = false;
  }
}
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-justify-content-between fr-mb-3w" data-testid="compliance-header">
    <div class="fr-col">
      <h3 class="fr-mb-0">Gestion des conformités</h3>
    </div>

    <div class="fr-col-auto">
      <DsfrButton
        v-if="hasComplianceEditPermission"
        icon="fr-icon-leaf-line"
        size="sm"
        secondary
        label="Calculer EcoIndex"
        :disabled="isLoading || isScanningEcoIndex"
        data-testid="compliance-scan-ecoindex-btn"
        class="fr-mr-1w"
        @click="runEcoIndexScan"
      ></DsfrButton>
      <DsfrButton
        icon="fr-icon-add-line"
        label="Ajouter une conformité"
        :disabled="isLoading || !hasComplianceEditPermission"
        data-testid="compliance-add-btn"
        @click="onAddClick"
      ></DsfrButton>
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
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <RgaaComplianceSection :application-id="applicationId" class="fr-mt-4w" />

    <section class="fr-mt-4w" data-testid="compliance-ecoindex-section">
      <div class="fr-grid-row fr-grid-row--middle fr-justify-content-between fr-mb-2w">
        <h4 class="fr-mb-0">Eco index</h4>
      </div>

      <ul data-testid="compliance-ecoindex-values">
        <li>
          <strong>Score EcoIndex :</strong>
          <span class="compliance-value">{{ ecoIndexValues.score ?? NO_ECOINDEX_LABEL }}</span>
        </li>
        <li>
          <strong>Émissions GES (gCO2e) :</strong>
          <span class="compliance-value">{{ ecoIndexValues.ges ?? NO_ECOINDEX_LABEL }}</span>
        </li>
        <li>
          <strong>Consommation d'eau (cl) :</strong>
          <span class="compliance-value">{{ ecoIndexValues.water ?? NO_ECOINDEX_LABEL }}</span>
        </li>
        <li>
          <strong>URL cible :</strong>
          <template v-if="isEditingTargetUrl">
            <form class="fr-mt-1w" @submit.prevent="saveTargetUrl">
              <DsfrInput
                v-model="targetUrlDraft"
                :label="complianceFieldLabels.eco_index_target_url"
                label-visible
                type="url"
                data-testid="ecoindex-target-url-input"
              />
              <div class="fr-mt-1w">
                <DsfrButton
                  type="submit"
                  size="sm"
                  :loading="isSavingTargetUrl"
                  label="Enregistrer"
                  class="fr-mr-1w"
                  data-testid="ecoindex-target-url-save"
                />
                <DsfrButton
                  type="button"
                  size="sm"
                  secondary
                  label="Annuler"
                  @click="cancelEditTargetUrl"
                  data-testid="ecoindex-target-url-cancel"
                />
              </div>
            </form>
          </template>
          <template v-else>
            <span class="compliance-value">{{ ecoIndexValues.targetUrl ?? NO_ECOINDEX_LABEL }}</span>
            <DsfrButton
              v-if="hasComplianceEditPermission"
              tertiary
              size="sm"
              icon="ri-edit-line"
              :no-outline="true"
              label="Modifier"
              aria-label="Modifier l'URL cible EcoIndex"
              class="fr-ml-1w"
              data-testid="ecoindex-target-url-edit-btn"
              @click="startEditTargetUrl"
            />
          </template>
        </li>
        <li>
          <strong>Dernier calcul :</strong>
          <span class="compliance-value">{{
            ecoIndexValues.lastCalculatedAt ? formatDate(String(ecoIndexValues.lastCalculatedAt)) : NO_ECOINDEX_LABEL
          }}</span>
        </li>
      </ul>
    </section>
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
