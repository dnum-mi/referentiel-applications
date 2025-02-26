<script setup lang="ts">
import { ref } from "vue";
import type { Application } from "@/models/Application";
import useToaster from "@/composables/use-toaster";
import Applications from "@/api/application";
import AppDate from "./AppDate.vue";
import { formatDate } from "@/composables/use-date";
import { computed } from "vue";

const isSubmitting = ref(false);
const toaster = useToaster();

const emit = defineEmits(["update:application"]);

const props = defineProps<{
  application: Application;
  tags: string[];
  small?: boolean;
}>();

const application = ref<Application>({ ...props.application });

const lifecycleStatusesDict: Record<string, { label: string; icon: string; color: string }> = {
  under_construction: { label: "En construction", icon: "fr-icon-info-line", color: "fr-tag--blue" },
  in_production: { label: "En production", icon: "fr-icon-success-line", color: "fr-tag--green" },
  decommissioned: { label: "Décommissioné", icon: "fr-icon-error-line", color: "fr-tag--grey" },
  decommissioning: { label: "En décomissionnement", icon: "fr-icon-warning-line", color: "fr-tag--orange" },
};

const lifecycleStatus = computed(() => {
  const status = application.value.lifecycle?.status;
  const statusData = lifecycleStatusesDict[status] || { label: "Statut inconnu", icon: "fr-icon-alert-line", color: "fr-tag--grey" };
  return statusData;
});

const isEditModalOpen = ref(false);

const openEditModal = () => {
  isEditModalOpen.value = true;
};

const closeEditModal = () => {
  isEditModalOpen.value = false;
};

async function updateApplication(updatedData) {
  isSubmitting.value = true;
  try {
    const updatedApplication = await Applications.patchApplication({
      ...props.application,
      ...updatedData,
    });

    application.value = updatedApplication;
    emit("update:application", updatedApplication);
    toaster.addSuccessMessage("Application mise à jour avec succès");
    closeEditModal();
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la mise à jour de l'application");
  } finally {
    isSubmitting.value = false;
  }
}

watch(
  () => props.application,
  (newVal) => {
    application.value = { ...newVal };
  },
  { deep: true, immediate: true },
);
</script>
<template>
  <div class="fr-grid-row fr-grid-row--gutters">
    <div class="fr-col-8">
      <div class="fr-card">
        <div class="fr-card__body">
          <div class="fr-card__content">
            <slot>
              <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
                <div class="fr-col">
                  <h3 class="fr-mb-0">Informations générales</h3>
                </div>
                <div class="fr-col-auto">
                  <DsfrButton tertiary size="sm" class="fr-btn--icon-left fr-icon-edit-line" label="Modifier" @click="openEditModal" />
                </div>
              </div>

              <h4>Description</h4>
              <p>{{ application.description }}</p>

              <h4 class="fr-mt-3w">Objectifs</h4>
              <ul>
                <li v-for="purpose in application.purposes" :key="purpose">
                  {{ purpose }}
                </li>
              </ul>

              <h4 class="fr-mt-3w">Tags</h4>
              <ul class="fr-tags-group">
                <li v-for="tag in application.tags" :key="tag">
                  <DsfrTag :label="tag" :small="small" />
                </li>
              </ul>
            </slot>
          </div>
        </div>
      </div>
    </div>

    <div class="fr-col-4">
      <div class="lifecycle-info">
        <h4 class="fr-mt-3w">Statut</h4>
        <DsfrTag :label="lifecycleStatus.label" :icon="lifecycleStatus.icon" :class="lifecycleStatus.color" />
        <h4 class="fr-mt-3w">Dates clés</h4>
        <p>
          Date de première production :
          {{ application.lifecycle?.firstProductionDate ? formatDate(application.lifecycle?.firstProductionDate) : "Non défini" }}
        </p>
        <p>
          Date de décommission prévue :
          {{
            application.lifecycle?.plannedDecommissioningDate ? formatDate(application.lifecycle?.plannedDecommissioningDate) : "Non défini"
          }}
        </p>
      </div>
    </div>
  </div>

  <DsfrModal :opened="isEditModalOpen" title="Modifier l'application" size="lg" @close="closeEditModal">
    <ApplicationForm
      v-if="application"
      :initial-data="application"
      :is-submitting="isSubmitting"
      @submit="updateApplication"
      @cancel="closeEditModal"
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

.lifecycle-info {
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.fr-tag--blue {
  background-color: #007bff;
}

.fr-tag--green {
  background-color: #28a745;
}

.fr-tag--orange {
  background-color: #ff9800;
}

.fr-tag--grey {
  background-color: #6c757d;
}
</style>
