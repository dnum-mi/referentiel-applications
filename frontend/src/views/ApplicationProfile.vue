<script setup lang="ts">
import type { Application, ApplicationWithPerms } from "@/models/Application";
import ApplicationOverview from "@/components/ApplicationOverview.vue";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { formatDate, formatDateFR } from "@/composables/use-date";
import { statusApplicationDictionary } from "@/composables/use-dictionary";
import { useApplicationStore } from "@/stores/applicationStore";
import { useMetadataStore } from "@/stores/metadataStore";
import { useUserStore } from "@/stores/userStore";
import { AdminLevel } from "@/models/user";

const userStore = useUserStore();
const applicationStore = useApplicationStore();
const metadataStore = useMetadataStore();
const route = useRoute();
const id = route.params.id as string;
const application = computed<ApplicationWithPerms>(() => applicationStore.applicationsById[id]);
const applicationUpdated = ref<Application | null>(null);
const isLoading = ref(false);
const errorMessage = ref("");

const deleteModalOpened = ref(false);
const deleteConfirmationInput = ref("");
const applicationLabel = computed(() => application.value?.label ?? "");

async function handleApplicationUpdate(updateData: Application) {
  applicationUpdated.value = updateData;
  await applicationStore.fetchApplication(id);
  if (application.value.myPerms.has("readMetadata") || userStore.adminLevel >= AdminLevel.READ) {
    await metadataStore.getFirstAndLastMetadataByApplication(updateData.id);
  }
}

async function loadApplication() {
  isLoading.value = true;
  try {
    await applicationStore.fetchApplication(id);
    if (application.value.myPerms.has("readMetadata") || userStore.adminLevel >= AdminLevel.READ) {
      await metadataStore.getFirstAndLastMetadataByApplication(id);
    }
  } finally {
    isLoading.value = false;
  }
}
onMounted(loadApplication);

function resetModal() {
  deleteModalOpened.value = false;
  deleteConfirmationInput.value = "";
};

const actions = computed(() => [
  {
    label: "Supprimer définitivement",
    disabled: deleteConfirmationInput.value !== applicationLabel.value,
    async onClick() {
      resetModal();
      await applicationStore.deleteApplication(id);
    },
  },
  {
    label: "Annuler",
    secondary: true,
    onClick() {
      resetModal();
    },
  },
]);
</script>

<template>
  <div>
    <DsfrBreadcrumb data-testid="breadcrumb" />
    <div v-if="isLoading" data-testid="application-loading">
      Chargement...
    </div>
    <div v-else-if="errorMessage" data-testid="application-error">
      {{ errorMessage }}
    </div>
    <div v-else-if="application" style="position: relative; margin: 2rem 1rem;" data-testid="application-profile">
      <h1 data-testid="application-title">
        {{ application.label }}
        <p v-if="metadataStore.firstMetadata" class="subtitle" data-testid="application-created-at">
          Date de création de la fiche  : {{ new Date(metadataStore.firstMetadata.createdAt).toLocaleDateString("fr-FR") || "inconnue" }} ({{
            metadataStore.firstMetadata.createdBy?.email
          }})
        </p>
        <p v-if="metadataStore.lastMetadata" class="subtitle" data-testid="application-updated-at">
          Dernière modification de la fiche {{ formatDate(metadataStore.lastMetadata.createdAt) || "inconnue" }} ({{ metadataStore.lastMetadata.createdBy?.email }})
        </p>
        <DsfrTag 
          v-if="application.currentStatus?.status" 
          class="fr-mr-2w" 
          :label="application.currentStatus.statusDate 
            ? `${statusApplicationDictionary[application.currentStatus.status]} (${formatDateFR(application.currentStatus.statusDate)})` 
            : statusApplicationDictionary[application.currentStatus.status]" 
          data-testid="application-status-tag" 
        />
        <DsfrTag :label="`IQ: ${application.quality ?? 'non renseigné'}%`" data-testid="application-iq-tag" />
      </h1>

      <DsfrButton
        v-if="userStore.adminLevel >= AdminLevel.ADMIN"
        class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-delete-line"
        style="position: absolute; top: 0; right: 0;"
        data-testid="application-delete-btn"
        title="Supprimer définitivement cette application"
        aria-label="Supprimer définitivement cette application" @click="deleteModalOpened = true"
      >
        Supprimer l’application
      </DsfrButton>
      <ApplicationOverview :application="application" data-testid="application-overview" @update:application="handleApplicationUpdate" />
    </div>
  </div>

  <DsfrModal
    v-model:opened="deleteModalOpened"
    title="Supprimer définitivement l’application"
    :actions="actions"
    data-testid="application-delete-modal"
    @close="resetModal"
  >
    <DsfrAlert
      title="Cette action est irréversible"
      :description="`Cela concerne l'application ainsi que toutes ses données. Pour confirmer, veuillez retaper le nom de l’application : ${applicationLabel}`"
      type="warning"
      class="fr-mb-3w"
      data-testid="application-delete-alert"
    />
    <DsfrInput
      v-model="deleteConfirmationInput"
      type="text"
      placeholder="Nom de l’application"
      data-testid="application-delete-input"
      title="Entrez le nom de l’application pour confirmer"
      aria-label="Entrer le nom de l’application pour confirmer"
    />
  </DsfrModal>
</template>

<style scoped>
.subtitle {
  font-weight: bold;
  font-size: 1rem;
  color: #666;
  margin-bottom: 0.3em;
}
</style>
