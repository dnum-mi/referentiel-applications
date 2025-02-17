<script setup lang="ts">
import { ref, computed, watch } from "vue";
import Applications from "@/api/application";
import type { Application, Compliance } from "@/models/Application";
import useToaster from "@/composables/use-toaster";
import AppDate from "./AppDate.vue";
import { defineProps, defineEmits } from "vue";
import { routeNames } from "@/router/route-names";
import { formatDate } from "@/composables/use-date";

const toaster = useToaster();
const currentPage = ref<number>(0);

const props = defineProps({
  application: {
    type: Object,
    required: true,
  },
  title: { type: String, default: "" },
  icon: { type: String, default: "" },
});

const emit = defineEmits(["update:application"]);

const localCompliances = ref<Compliance[]>(Array.isArray(props.application.compliances) ? [...props.application.compliances] : []);
const headers = ["Nom", "Type", "Statut", "Date de début", "Date de fin", "Score", "Notes", "Actions"];

watch(
  () => props.application.compliances,
  (newVal) => {
    if (JSON.stringify(newVal) !== JSON.stringify(localCompliances.value)) {
      localCompliances.value = Array.isArray(newVal) ? [...newVal] : [];
    }
  },
);

const complianceTypesDict = {
  regulation: "Réglementation",
  standard: "Standard",
  policy: "Politique",
  contractual: "Contractuel",
  security: "Sécurité",
  privacy: "Confidentialité",
};

const complianceStatusesDict = {
  compliant: "Conforme",
  non_compliant: "Non conforme",
  partially_compliant: "Partiellement conforme",
  not_concerned: "Non concerné",
};

const complianceTypes = computed(() => [
  { value: "", text: "Choisir un type de conformité" },
  ...Object.entries(complianceTypesDict).map(([value, text]) => ({ value, text })),
]);

const complianceStatuses = computed(() => [
  { value: "", text: "Choisir un statut" },
  ...Object.entries(complianceStatusesDict).map(([value, text]) => ({ value, text })),
]);

const loading = ref(false);
const selectedComplianceIds = ref<string[]>([]);
const hasChanges = computed(() => JSON.stringify(localCompliances.value) !== JSON.stringify(props.application.compliances));

const rows = computed(() =>
  localCompliances.value.map((compliance: any) => [
    complianceTypesDict[compliance.type] || "Non défini",
    compliance.name,
    complianceStatusesDict[compliance.status] || "Non défini",
    formatDate(compliance.validityStart),
    formatDate(compliance.validityEnd),
    compliance.scoreValue + compliance.scoreUnit,
    compliance.notes,
    compliance.id,
  ]),
);

function addCompliance() {
  localCompliances.value.push({
    id: Date.now().toString(),
    name: "",
    type: "",
    status: "",
    validityStart: "",
    validityEnd: "",
    scoreValue: "",
    scoreUnit: "",
    notes: "",
    applicationId: props.application.id,
  });
}

function removeCompliance(complianceId: string) {
  localCompliances.value = localCompliances.value.filter((compliance) => compliance.id !== complianceId);
}

function removeSelectedCompliances() {
  localCompliances.value = localCompliances.value.filter((compliance) => !selectedComplianceIds.value.includes(compliance.id));
  selectedComplianceIds.value = [];
}

function cancelChanges() {
  localCompliances.value = Array.isArray(props.application.compliances) ? [...props.application.compliances] : [];
}

async function saveAll() {
  for (const compliance of localCompliances.value) {
    if (!compliance.name.trim()) {
      toaster.addErrorMessage("Le nom de la conformité est requis.");
      return;
    }
  }

  const existingIds = new Set((props.application.compliances || []).map((c: Compliance) => c.id));
  const compliancesToSave = localCompliances.value.map((compliance) =>
    existingIds.has(compliance.id) ? compliance : { ...compliance, id: undefined },
  );

  loading.value = true;
  try {
    const updatedApplication = await Applications.patchApplication({
      ...props.application,
      compliances: compliancesToSave,
    });
    emit("update:application", updatedApplication);
    toaster.addSuccessMessage("Conformités sauvegardées avec succès !");
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la sauvegarde des conformités.");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="fr-grid-row fr-grid-row--gutters">
    <div class="fr-col-12">
      <div class="fr-card" :class="{ 'fr-card--no-border': noBorder }">
        <div class="fr-card__body">
          <div class="fr-card__content">
            <slot>
              <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
                <div class="fr-col">
                  <h3 class="fr-mb-0">Conformités</h3>
                </div>
                <div class="fr-col-auto">
                  <DsfrButton secondary icon="add-line" label="Ajouter une conformité" @click="$emit('add-compliance')" />
                </div>
              </div>
              <div v-if="rows.length === 0" class="text-center">
                <p>Aucune conformité trouvée.</p>
              </div>

              <DsfrDataTable
                v-else
                v-model:selection="selectedComplianceIds"
                v-model:current-page="currentPage"
                :headers-row="headers"
                :rows="rows"
                selectable-rows
                row-key="id"
                :title="'Liste des conformités'"
                pagination
                :rows-per-page="10"
                :pagination-options="[10, 20, 30]"
                bottom-action-bar-class="bottom-action-bar-class"
                pagination-wrapper-class="pagination-wrapper-class"
                sorted="id"
                :sortable-rows="['id']"
              >
                <template #cell="{ colKey, cell }">
                  <template v-if="colKey === 'Nom'">
                    {{ cell }}
                  </template>
                  <template v-if="colKey === 'Type'">
                    {{ cell }}
                  </template>
                  <template v-if="colKey === 'Statut'">
                    <DsfrTag :label="cell" />
                  </template>
                  <template v-if="colKey === 'Date de début' || colKey === 'Date de fin'">
                    {{ cell }}
                  </template>
                  <template v-if="colKey === 'Score'">
                    {{ cell }}
                  </template>
                  <template v-if="colKey === 'Notes'">
                    {{ cell }}
                  </template>
                  <template v-if="colKey === 'Actions'">
                    <DsfrButton secondary label="Modifier" @click="$emit('edit-compliance', cell)" />
                    <DsfrButton tertiary label="Supprimer" @click="removeCompliance(cell)" />
                  </template>
                </template>
              </DsfrDataTable>
            </slot>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-center {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #555;
  font-size: 1.2rem;
  font-weight: 500;
  background-color: #f9f9f9;
  border: 1px dashed #ccc;
  border-radius: 8px;
  padding: 20px;
  margin: 20px auto;
  width: 80%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.text-center p {
  margin: 0;
  text-align: center;
}
</style>
