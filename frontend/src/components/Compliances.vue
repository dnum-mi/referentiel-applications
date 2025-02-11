<script setup lang="ts">
import { ref, computed, watch } from "vue";
import Applications from "@/api/application";
import type { Application, Compliance } from "@/models/Application";
import useToaster from "@/composables/use-toaster";
import AppDate from "./AppDate.vue";
import { defineProps, defineEmits } from "vue";

const toaster = useToaster();

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

watch(
  () => props.application.compliances,
  (newVal) => {
    localCompliances.value = Array.isArray(newVal) ? [...newVal] : [];
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

function addCompliance() {
  localCompliances.value.push({
    id: Date.now().toString(),
    name: "",
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
  <div>
    <div class="header">
      <h2>Gestion des Conformités</h2>
    </div>

    <div class="global-delete">
      <DsfrButton type="button" tertiary @click="removeSelectedCompliances" :disabled="selectedComplianceIds.length === 0">
        Supprimer la sélection
      </DsfrButton>
    </div>

    <table class="compliance-table">
      <thead>
        <tr>
          <th>Sélection</th>
          <th>Nom</th>
          <th>Type de conformité</th>
          <th>Statut</th>
          <th>Notes</th>
          <th>Date de début</th>
          <th>Date de fin</th>
          <th>Score</th>
          <th>Unité de score</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="compliance in localCompliances" :key="compliance.id">
          <td>
            <input type="checkbox" :value="compliance.id" v-model="selectedComplianceIds" />
          </td>
          <td>
            <DsfrInput v-model="compliance.name" placeholder="Nom de la conformité" />
          </td>
          <td>
            <DsfrSelect v-model="compliance.type" :options="complianceTypes" />
          </td>
          <td>
            <DsfrSelect v-model="compliance.status" :options="complianceStatuses" />
          </td>
          <td>
            <DsfrInput v-model="compliance.notes" placeholder="Notes" isTextarea />
          </td>
          <td>
            <AppDate v-model="compliance.validityStart" label="Date de début" />
          </td>
          <td>
            <AppDate v-model="compliance.validityEnd" label="Date de fin" />
          </td>
          <td>
            <DsfrInput v-model="compliance.scoreValue" placeholder="Score" />
          </td>
          <td>
            <DsfrInput v-model="compliance.scoreUnit" placeholder="Unité" />
          </td>
        </tr>
      </tbody>
    </table>

    <div class="actions">
      <DsfrButton type="button" class="add-btn" @click="addCompliance">Ajouter une conformité</DsfrButton>
      <DsfrButton type="button" class="cancel-btn" @click="cancelChanges" :disabled="!hasChanges"> Annuler </DsfrButton>
      <DsfrButton type="button" class="save-btn" @click="saveAll" :loading="loading">Sauvegarder</DsfrButton>
    </div>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.compliance-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid var(--dsfr-border, #ccc);
  overflow: hidden;
  background-color: #fff;
  font-family: var(--dsfr-font-family, Arial, sans-serif);
}
.compliance-table thead {
  background-color: var(--dsfr-gray-10, #f9f9f9);
  color: #5a5959;
}
.compliance-table th,
.compliance-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--dsfr-border, #ccc);
  text-align: left;
}
.compliance-table th {
  font-size: 0.95rem;
  font-weight: 600;
}
.compliance-table tbody tr:last-child td {
  border-bottom: none;
}
.compliance-table tbody tr:nth-child(even) {
  background-color: var(--dsfr-gray-50, #fbfbfb);
}
.compliance-table tbody tr:hover {
  background-color: var(--dsfr-gray-100, #f7f7f7);
}

.compliance-table input[type="checkbox"] {
  width: 1.2rem;
  height: 1.2rem;
  cursor: pointer;
}

.global-delete {
  margin-bottom: 1rem;
  display: flex;
  justify-content: flex-start;
}
.global-delete DsfrButton {
  background-color: var(--dsfr-error, #d32f2f);
  color: #fff;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  transition: filter 0.3s;
}
.global-delete DsfrButton:hover:not(:disabled) {
  filter: brightness(0.9);
}

.actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
.actions DsfrButton {
  padding: 0.6rem 1.2rem;
  border-radius: 4px;
  font-weight: 600;
  transition: filter 0.3s;
}
.actions DsfrButton:hover:not(:disabled) {
  filter: brightness(0.95);
}
.cancel-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
