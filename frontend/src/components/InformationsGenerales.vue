<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import type { Application, Label } from "@/models/Application";
import useToaster from "@/composables/use-toaster";
import Applications from "@/api/application";
import ApplicationForm from "./form/ApplicationForm.vue";
import useModal from "@/composables/use-modal";
import axios from "axios";

const isSubmitting = ref(false);
const toaster = useToaster();
const emit = defineEmits(["update:application"]);
const loading = ref(false);

const props = defineProps<{
  application: Application;
  tags: string[];
  targetPopulations: string[];
  small?: boolean;
}>();

const application = ref<Application>({ ...props.application });
const labels = ref<Label[]>([]);
const applicationModal = useModal();

const isModalOpened = computed(() => applicationModal.isModalOpen.value);

const filteredAltLabels = computed(() =>
  labels.value.filter(
    (label) =>
      label.value.toLowerCase() !== application.value.label.toLowerCase() ||
      (label.shortname && label.shortname.toLowerCase() !== application.value.shortName.toLowerCase()),
  ),
);

async function updateApplication(updatedData: any) {
  isSubmitting.value = true;
  try {
    loading.value = true;
    applicationModal.closeModal();

    const updatedApplication = await Applications.patchApplication({
      ...props.application,
      ...updatedData,
    });

    if (updatedData.deletedLabels.length > 0) {
      const labelIds = updatedData.deletedLabels.map((label: Label) => label.id);
      await deleteLabels(labelIds);
    }

    if (updatedData.updatedLabels.length > 0) {
      await updateLabels(updatedData.updatedLabels);
    }

    if (updatedData.newLabels.length > 0) {
      await createLabels(updatedData.newLabels);
    }

    application.value = updatedApplication;
    emit("update:application", updatedApplication);
    await fetchLabels();
    toaster.addSuccessMessage("Application mise à jour avec succès");
  } catch (error) {
    console.error(error);
    toaster.addErrorMessage("Erreur lors de la mise à jour de l'application");
  } finally {
    isSubmitting.value = false;
    loading.value = false;
  }
}

async function createLabels(newLabels: Label[]) {
  for (const label of newLabels) {
    try {
      await axios.post(`applications/${props.application.id}/labels`, {
        source: label.source,
        value: label.value,
        shortname: label.shortname,
      });
    } catch (error) {
      console.error(error);
      toaster.addErrorMessage(`Erreur lors de la création du label: ${label.value}`);
    }
  }
}

async function updateLabels(updatedLabels: Label[]) {
  for (const label of updatedLabels) {
    try {
      await axios.patch(`applications/${props.application.id}/labels/${label.id}`, {
        source: label.source,
        value: label.value,
        shortname: label.shortname,
      });
    } catch (error) {
      console.error(error);
      toaster.addErrorMessage(`Erreur lors de la modification du label: ${label.value}`);
    }
  }
}

async function deleteLabels(labelIds: string[]) {
  await Promise.all(labelIds.map((labelId) => axios.delete(`applications/${props.application.id}/labels/${labelId}`)));
}

async function fetchLabels() {
  try {
    const response = await axios.get(`applications/${props.application.id}/labels`);
    labels.value = response.data;
  } catch (error) {
    console.error(error);
    toaster.addErrorMessage("Erreur lors de la récupération des labels.");
  }
}

onMounted(fetchLabels);

const priorityConfig = new Map<string, { type: string; label: string; tooltip: string }>([
  ["p0", { type: "error", label: "P0 – Critique", tooltip: "Service vital – doit redémarrer en priorité absolue" }],
  ["p1", { type: "warning", label: "P1 – Haute", tooltip: "Important – redémarrage rapide nécessaire" }],
  ["p2", { type: "info", label: "P2 – Moyenne", tooltip: "Peut attendre une reprise partielle" }],
  ["p3", { type: "default", label: "P3 – Normale", tooltip: "Pas de contrainte forte de redémarrage" }],
  ["p4", { type: "none", label: "P4 – Faible", tooltip: "Faible priorité – redémarrage après les autres" }],
  ["p5", { type: "none", label: "P5 – Très faible", tooltip: "Dernier à redémarrer – peu critique" }],
]);

const getPriorityBadgeType = (priority?: string) =>
  priorityConfig.get(priority ?? "") ?? {
    type: "none",
    label: "Non définie",
    tooltip: "Aucune priorité n’a été définie pour cette application",
  };

watch(
  () => props.application,
  (newVal) => {
    application.value = { ...newVal };
  },
  { immediate: true },
);
</script>

<template>
  <div class="fr-grid-row fr-grid-row--gutters">
    <div class="fr-col-12 fr-col-md-8">
      <div class="fr-card">
        <div class="fr-card__body">
          <div class="fr-card__content">
            <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
              <div class="fr-col">
                <h3 class="fr-mb-0">Informations générales</h3>
              </div>
              <div class="fr-col-auto">
                <DsfrButton
                  tertiary
                  size="sm"
                  class="fr-btn--icon-left fr-icon-edit-line"
                  label="Modifier"
                  @click="applicationModal.openModal()"
                />
              </div>
            </div>

            <AppLoader v-if="loading" />

            <div v-else>
              <h4>ID de l'application</h4>
              <p>{{ application.id }}</p>

              <div v-if="filteredAltLabels.length > 0" class="fr-col-4">
                <h4>Libellés Alternatifs (Noms courts)</h4>
                <p>
                  {{ filteredAltLabels.map((label) => `${label.value} (${label.shortname || ""})`).join(" ; ") }}
                </p>
              </div>

              <h4>Description</h4>
              <p>{{ application.description }}</p>

              <h4 class="fr-mt-3w">Objectifs</h4>
              <ul v-if="application.purposes?.length">
                <li v-for="purpose in application.purposes" :key="purpose">{{ purpose }}</li>
              </ul>

              <h4 class="fr-mt-3w">Tags</h4>
              <ul v-if="application.tags?.length" class="fr-tags-group">
                <li v-for="tag in application.tags" :key="tag">
                  <DsfrTag :label="tag" :small="small" />
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="fr-col-12 fr-col-md-4 fr-mt-3w fr-mt-md-0" style="display: flex; flex-direction: column; gap: 1rem">
      <div class="fr-card">
        <div class="fr-card__body">
          <div class="fr-card__content">
            <h3 class="fr-card__title">Priorité de redémarrage</h3>
            <div class="fr-card__desc">
              <template v-if="application.priorityRestart">
                <DsfrBadge
                  :label="getPriorityBadgeType(application.priorityRestart).label"
                  :type="getPriorityBadgeType(application.priorityRestart).type"
                  :small="small"
                  :title="getPriorityBadgeType(application.priorityRestart).tooltip"
                  :aria-label="`Priorité de redémarrage : ${getPriorityBadgeType(application.priorityRestart).tooltip}`"
                />
              </template>
              <template v-else>
                <p class="fr-text--sm fr-text--italic">Aucune priorité définie.</p>
              </template>
            </div>
          </div>
        </div>
      </div>

      <div v-if="(application.targetPopulations ?? []).length > 0" class="fr-card">
        <div class="fr-card__body">
          <div class="fr-card__content">
            <h3 class="fr-card__title">Population</h3>
            <div class="fr-card__desc">
              <ul class="fr-tags-group">
                <li v-for="targetPopulation in application.targetPopulations" :key="targetPopulation">
                  <DsfrTag :label="targetPopulation" :small="small" />
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal -->
  <DsfrModal :opened="isModalOpened" title="Modifier l'application" @close="applicationModal.closeModal">
    <ApplicationForm
      v-bind="{ initialData: application, labels }"
      :is-submitting="isSubmitting"
      @submit="updateApplication"
      @cancel="applicationModal.closeModal"
    />
  </DsfrModal>
</template>

<style scoped>
.fr-tags-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
