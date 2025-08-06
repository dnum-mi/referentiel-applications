<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { ApplicationWithPerms } from "@/models/Application";
import { useComplianceStore } from "@/stores/complianceStore";
import ComplianceForm from "./ComplianceForm.vue";
import { testResultsDict, backupStorageDict, complianceFieldLabels } from "@/composables/use-dictionary";
import { formatDateFR } from "@/composables/use-date";
import { filterEmpty } from "@/composables/use-filter-watcher";

// Props
const props = defineProps<{ application: ApplicationWithPerms }>();
const applicationId = props.application.id;

// Store
const store = useComplianceStore();

// États
const activeAccordion = ref(-1);
const showModal = ref(false);
const modalMode = ref<"create" | "edit">("create");
const selectedType = ref<string | null>(null);

// Types et labels
type ComplianceType = "dima" | "pdma" | "homologation" | "rgaa" | "dsfr" | "rgpd";
const types: ComplianceType[] = ["dima", "pdma", "homologation", "rgaa", "dsfr", "rgpd"];
const labels: Record<ComplianceType, string> = {
  dima: "DIMA",
  pdma: "PDMA",
  homologation: "Homologation",
  rgaa: "RGAA",
  dsfr: "DSFR",
  rgpd: "RGPD",
};

// Extraction des données
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

  // on nettoie chaque objet
  (Object.keys(result) as ComplianceType[]).forEach((t) => {
    result[t] = filterEmpty(result[t]);
  });

  return result;
});

// Types avec données
const typesWithData = computed(() =>
  types.filter((t) => {
    const data = compliances.value[t];
    return data && Object.keys(data).length > 0;
  }),
);

// Détecte si le type sélectionné est nouveau
const isNewType = computed(() => {
  return selectedType.value != null && !typesWithData.value.includes(selectedType.value as any);
});

// Preview fns
const previewFns: Record<ComplianceType, (d: Record<string, any>) => string> = {
  dima: (d) => {
    const parts: string[] = [];
    if (d.duration_hours != null) {
      parts.push(`${d.duration_hours}H`);
    }
    parts.push(d.is_hno ? "Heure non ouvrée" : "Heure ouvrée");
    return parts.join(" • ");
  },

  pdma: d => `${d.duration_hours}H`,
  homologation: () => "",
  rgaa: (d) => {
    const score = d.score_percentage;
    // pas de score ou score < 50 => non-conformité
    if (score == null || score < 50) {
      return "Non-conformité";
    }
    // score à 100 => conformité totale
    if (score === 100) {
      return "Conformité totale";
    }
    // sinon, conformité partielle (50 ≤ score < 100)
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
  // DIMA : résultat de test
  if (type === "dima" && key === "test_result") {
    return testResultsDict[val];
  }
  // PDMA : stockage de backup
  if (type === "pdma" && key === "backup_storage") {
    return backupStorageDict[val];
  }
  // DIMA : heure non ouvrée
  if (type === "dima" && key === "is_hno") {
    return val ? "Oui" : "Non";
  }
  // DSFR : implémenté
  if (type === "dsfr" && key === "implemented") {
    return val ? "Oui" : "Non";
  }
  // RGPD : AIPD réalisée
  if (key === "has_aipd") {
    return val ? "Oui" : "Non";
  }
  // Tous les champs date (date d’homologation ou *_date)
  if ((key === "date" || key.endsWith("_date")) && val) {
    return formatDateFR(val);
  }
  // Valeur brute pour tout le reste
  return String(val);
}

// Rafraîchir les données
async function refresh() {
  await store.fetchCompliance(applicationId);
  selectedType.value = null;
  showModal.value = false;
}

onMounted(refresh);

// Ouvrir la modal
function onAddClick() {
  // Premier create vs edit ensuite
  modalMode.value = store.compliance && (store.compliance.id || typesWithData.value.length > 0) ? "edit" : "create";
  selectedType.value = null;
  showModal.value = true;
}

// Ouvrir la modal en édition d'un type
function onEditClick(type: ComplianceType) {
  modalMode.value = "edit";
  selectedType.value = type;
  showModal.value = true;
}

// Fermer la modal
function closeModal() {
  showModal.value = false;
  selectedType.value = null;
}
</script>

<template>
  <!-- Header -->
  <div class="fr-grid-row fr-grid-row--middle fr-justify-content-between fr-mb-3w">
    <!-- Titre à gauche (col qui remplit tout l'espace restant) -->
    <div class="fr-col">
      <h3 class="fr-mb-0">
        Gestion des conformités
      </h3>
    </div>

    <!-- Bouton à droite (col-auto pour s'ajuster précisément) -->
    <div class="fr-col-auto">
      <DsfrButton icon="fr-icon-add-line" size="sm" label="Ajouter" :disabled="store.isLoading" @click="onAddClick" />
    </div>
  </div>

  <!-- Loader -->
  <AppLoader v-if="store.isLoading" />

  <div v-else-if="typesWithData.length === 0" class="fr-mb-2w">
    <p>Aucune conformité renseignée pour cette application.</p>
  </div>

  <!-- Accordions -->
  <DsfrAccordionsGroup v-model="activeAccordion">
    <template v-for="(type, idx) in typesWithData" :key="type">
      <DsfrAccordion :index="idx" :title="labels[type] + (getPreview(type) ? ` • ${getPreview(type)}` : '')">
        <template #default>
          <div class="fr-mb-1w text-right">
            <DsfrButton size="xs" icon="ri-edit-line" label="Modifier" @click.stop="onEditClick(type)" />
          </div>
          <ul class="fr-pl-1w">
            <li v-for="(val, key) in compliances[type]" :key="key">
              <strong>{{ complianceFieldLabels[key] || key }}:</strong>
              {{ renderValue(type, key, val) }}
            </li>
          </ul>
        </template>
      </DsfrAccordion>
    </template>
  </DsfrAccordionsGroup>

  <!-- Modal -->
  <DsfrModal
    v-model:opened="showModal"
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
      <!-- Sélecteur si pas encore de type choisi -->
      <div v-if="!selectedType" class="fr-mb-2w">
        <DsfrSelect
          v-model="selectedType"
          :options="types.map((t) => ({ value: t, text: labels[t], disabled: typesWithData.includes(t) }))"
          label="Type de conformité"
          label-visible
          default-unselected-text="Sélectionner un type"
        />
      </div>
      <!-- Formulaire dès qu'un type est choisi -->
      <ComplianceForm
        v-if="selectedType"
        :application="application"
        :opened="showModal"
        :application-id="applicationId"
        :type="selectedType"
        :mode="modalMode"
        :initial-data="compliances[selectedType] || null"
        :submit-label="isNewType ? 'Créer' : 'Enregistrer'"
        @saved="refresh"
      />
    </template>
    <template #footer>
      <DsfrButton type="button" label="Annuler" secondary @click="closeModal" />
    </template>
  </DsfrModal>
</template>
