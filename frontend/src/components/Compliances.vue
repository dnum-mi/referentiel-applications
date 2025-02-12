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

    <div class="compliance-cards">
      <div v-for="compliance in localCompliances" :key="compliance.id" class="compliance-card">
        <input type="checkbox" :value="compliance.id" v-model="selectedComplianceIds" class="select-checkbox" />
        <div class="card-content">
          <DsfrInput v-model="compliance.name" placeholder="Nom de la conformité" />
          <DsfrSelect v-model="compliance.type" :options="complianceTypes" />
          <DsfrSelect v-model="compliance.status" :options="complianceStatuses" />
          <DsfrInput v-model="compliance.notes" placeholder="Notes" isTextarea />
          <AppDate v-model="compliance.validityStart" label="Date de début" />
          <AppDate v-model="compliance.validityEnd" label="Date de fin" />
          <DsfrInput v-model="compliance.scoreValue" placeholder="Score" />
          <DsfrInput v-model="compliance.scoreUnit" placeholder="Unité" />
        </div>
      </div>
    </div>

    <div class="actions">
      <DsfrButton type="button" class="add-btn" @click="addCompliance">Ajouter une conformité</DsfrButton>
      <DsfrButton type="button" class="cancel-btn" @click="cancelChanges" :disabled="!hasChanges">Annuler</DsfrButton>
      <DsfrButton type="button" class="save-btn" @click="saveAll" :loading="loading">Sauvegarder</DsfrButton>
    </div>
  </div>
</template>

<style scoped>
.compliance-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.compliance-card {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);
  width: calc(33.333% - 1rem);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.select-checkbox {
  align-self: flex-start;
  margin-bottom: 0.5rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
  gap: 1rem;
}
</style>
