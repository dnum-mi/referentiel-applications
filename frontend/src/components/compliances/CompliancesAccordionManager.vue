<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { CreateApplicationWithPerms } from "@/models/Application";
import { useComplianceStore } from "@/stores/complianceStore";
import ComplianceForm from "./ComplianceForm.vue";
import {
  testResultsDict,
  backupStorageDict,
  homologationStatusDict,
  complianceFieldLabels,
  type ComplianceType,
} from "@/composables/use-dictionary";
import { formatDateFR } from "@/composables/use-date";
import { filterEmpty } from "@/composables/use-filter-watcher";
import { useBreakpoints } from "@/composables/use-breakpoint";
import { BREAKPOINTS } from "@/constants/breakpoint";
import RefAppTable from "@/components/RefAppTable.vue";
import type { TableColumn } from "@/types/table";

const props = defineProps<{ application: CreateApplicationWithPerms }>();
const applicationId = props.application.id;

const store = useComplianceStore();

const showModal = ref(false);
const modalMode = ref<"create" | "edit">("create");
const selectedType = ref<string | null>(null);

const showDetailsModal = ref(false);
const detailsTitle = ref("");
const detailsList = ref<{ key: string; label: string; value: string }[]>([]);

const { smaller } = useBreakpoints({ mobile: BREAKPOINTS.SMALL_CARD_MAX }, "max");
const isMobile = smaller("mobile");

const types: ComplianceType[] = ["dima", "pdma", "homologation", "rgaa", "dsfr", "rgpd"];
const labels: Record<ComplianceType, string> = {
  dima: "Délai d'Indisponibilité Maximale Admissible (DIMA)",
  pdma: "Perte de données maximale admissible (PDMA)",
  homologation: "Homologation",
  rgaa: "Référentiel général d’amélioration de l’accessibilité (RGAA)",
  dsfr: "Design Système de l'état (DSFR)",
  rgpd: "Règlement Général sur la Protection des Données (RGPD)",
};
const tableColumns: TableColumn[] = [
  { field: "Type", header: "Type", sortable: false },
  { field: "Résumé", header: "Résumé", sortable: false },
  { field: "Actions", header: "Actions", sortable: false },
];

const compliances = computed(() => {
  const result: Record<ComplianceType, Record<string, any>> = {};
  if (!store.compliance) return result;

  Object.entries(store.compliance).forEach(([key, value]) => {
    const [prefix, ...rest] = key.split("_");
    if (!(types as string[]).includes(prefix) || value == null || value === "") return;
    const field = rest.join("_");
    result[prefix as ComplianceType] ||= {};
    result[prefix as ComplianceType][field] = value;
  });

  (Object.keys(result) as ComplianceType[]).forEach((t) => {
    result[t] = filterEmpty(result[t]);
  });

  return result;
});

const typesWithData = computed(() =>
  types.filter((t) => {
    const data = compliances.value[t];
    return data && Object.keys(data).length > 0;
  }),
);

const isNewType = computed(() => {
  return selectedType.value != null && !typesWithData.value.includes(selectedType.value as any);
});

const previewFns: Record<ComplianceType, (d: Record<string, any>) => string> = {
  dima: (d) => {
    const parts: string[] = [];
    if (d.duration_hours != null) {
      parts.push(`${d.duration_hours}H`);
    }
    parts.push(d.is_hno ? "Heure non ouvrée" : "Heure ouvrée");
    return parts.join(" • ");
  },

  pdma: (d) => `${d.duration_hours ?? ""}H`.trim(),
  homologation: () => "",
  rgaa: (d) => {
    const score = d.score_percentage;
    if (score == null || score < 50) return "Non-conformité";
    if (score === 100) return "Conformité totale";
    return "Conformité partielle";
  },
  dsfr: () => "",
  rgpd: () => "",
};

function getPreview(type: ComplianceType): string {
  const data = compliances.value[type];
  return data ? previewFns[type](data) : "";
}

function renderValue(type: string, key: string, val: any): string {
  if (type === "dima" && key === "test_result") {
    return testResultsDict[val];
  }
  if (type === "pdma" && key === "backup_storage") {
    return backupStorageDict[val];
  }
  if (type === "homologation" && key === "status") {
    return homologationStatusDict[val] ?? val;
  }
  if (type === "dima" && key === "is_hno") {
    return val ? "Oui" : "Non";
  }
  if (type === "dsfr" && key === "implemented") {
    return val ? "Oui" : "Non";
  }
  if (key === "has_aipd") {
    return val ? "Oui" : "Non";
  }
  if ((key === "date" || key.endsWith("date_end")) && val) {
    return formatDateFR(val);
  }
  return String(val);
}

async function refresh() {
  await store.fetchCompliance(applicationId);
  selectedType.value = null;
  showModal.value = false;
}

onMounted(refresh);

function onAddClick() {
  modalMode.value = store.compliance && (store.compliance.id || typesWithData.value.length > 0) ? "edit" : "create";
  selectedType.value = null;
  showModal.value = true;
}

function onEditClick(type: ComplianceType) {
  modalMode.value = "edit";
  selectedType.value = type;
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  selectedType.value = null;
}

function openDetails(type: ComplianceType) {
  const details = compliances.value[type] || {};
  detailsList.value = Object.entries(details).map(([k, v]) => ({
    key: k,
    label: complianceFieldLabels[k] || k,
    value: renderValue(type, k, v),
  }));
  detailsTitle.value = labels[type];
  showDetailsModal.value = true;
}

function closeDetails() {
  showDetailsModal.value = false;
  detailsList.value = [];
  detailsTitle.value = "";
}

function getCardButtons(type: ComplianceType) {
  return [
    {
      label: "Voir",
      icon: "ri-eye-line",
      tertiary: true,
      size: "sm",
      onClick: (event?: Event) => {
        if (event && typeof event.stopPropagation === "function") event.stopPropagation();
        openDetails(type);
      },
      attrs: { "aria-label": `Voir ${labels[type]}` },
    },
    {
      label: "Modifier",
      icon: "ri-edit-line",
      tertiary: true,
      size: "sm",
      onClick: (event?: Event) => {
        if (event && typeof event.stopPropagation === "function") event.stopPropagation();
        onEditClick(type);
      },
      attrs: { "aria-label": `Modifier ${labels[type]}` },
    },
  ];
}

const tableRows = computed(() =>
  typesWithData.value.map((type) => {
    return {
      Type: labels[type],
      Résumé: getPreview(type as ComplianceType) || "",
      Actions: { typeKey: type },
    };
  }),
);
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-justify-content-between fr-mb-3w" data-testid="compliance-header">
    <div class="fr-col">
      <h3 class="fr-mb-0">Gestion des conformités</h3>
    </div>

    <div class="fr-col-auto">
      <DsfrButton
        icon="fr-icon-add-line"
        size="sm"
        label="Ajouter"
        :disabled="store.isLoading"
        data-testid="compliance-add-btn"
        @click="onAddClick"
      ></DsfrButton>
    </div>
  </div>

  <AppLoader v-if="store.isLoading" data-testid="compliance-loader"></AppLoader>

  <div v-else>
    <div v-if="typesWithData.length === 0" class="fr-mb-2w" data-testid="compliance-empty">
      <p>Aucune conformité renseignée pour cette application.</p>
    </div>

    <div v-if="!isMobile && typesWithData.length > 0">
      <RefAppTable :items="tableRows" :columns="tableColumns" data-testid="compliance-table">
        <template #body-Type="{ data }">
          <strong>{{ data.Type }}</strong>
        </template>

        <template #body-Résumé="{ data }">
          <DsfrTag v-if="data.Résumé" :label="data.Résumé"></DsfrTag>
          <span v-else>-</span>
        </template>

        <template #body-Actions="{ data }">
          <div class="fr-btns-group">
            <DsfrButton
              size="sm"
              tertiary
              icon="ri-eye-line"
              data-testid="compliance-view-btn"
              @click="() => openDetails(data.Actions.typeKey)"
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
              @click="() => onEditClick(data.Actions.typeKey)"
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
      <DsfrCard
        v-for="(type, idx) in typesWithData"
        :key="type"
        :title="labels[type]"
        :description="getPreview(type as ComplianceType) || ''"
        :buttons="getCardButtons(type as ComplianceType)"
        :noArrow="true"
        class="compliance-card"
        role="group"
        :data-testid="`compliance-card-${type}`"
      >
        <template #start-details>
          <DsfrTag :label="labels[type]"></DsfrTag>
        </template>

        <template #end-details>
          <DsfrTag v-if="getPreview(type as ComplianceType)" :label="getPreview(type as ComplianceType)"></DsfrTag>
        </template>
      </DsfrCard>
    </div>
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

  <DsfrModal
    :opened="showModal"
    data-testid="compliance-modal"
    :title="
      selectedType
        ? isNewType
          ? `Créer ${labels[selectedType]}`
          : `Modifier ${labels[selectedType]}`
        : 'Sélectionner un type de conformité'
    "
    @close="closeModal"
  >
    <template #default>
      <div v-if="!selectedType" class="fr-mb-2w">
        <DsfrSelect
          v-model="selectedType"
          data-testid="compliance-type-select"
          :options="types.map((t) => ({ value: t, text: labels[t], disabled: typesWithData.includes(t) }))"
          label="Type de conformité"
          label-visible
          default-unselected-text="Sélectionner un type"
        ></DsfrSelect>
      </div>

      <ComplianceForm
        v-if="selectedType"
        data-testid="compliance-form-container"
        :application="application"
        :opened="showModal"
        :application-id="applicationId"
        :type="selectedType"
        :mode="modalMode"
        :initial-data="compliances[selectedType] || null"
        :submit-label="isNewType ? 'Créer' : 'Enregistrer'"
        @saved="refresh"
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
