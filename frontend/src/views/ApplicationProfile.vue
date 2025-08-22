<script setup lang="ts">
import type { Application, ApplicationWithPerms } from "@/models/Application";
import ApplicationOverview from "@/components/ApplicationOverview.vue";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { formatDate } from "@/composables/use-date";
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

async function handleApplicationUpdate(updateData: Application) {
  applicationUpdated.value = updateData;
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

const opened = ref(false);
const confirmationInput = ref("");

const appName = computed(() => application.value?.label ?? "");

function resetModal() {
  opened.value = false;
  confirmationInput.value = "";
};

const actions = computed(() => [
  {
    label: "Supprimer définitivement",
    disabled: confirmationInput.value !== appName.value,
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
    <DsfrBreadcrumb />
    <div v-if="isLoading">
      Chargement...
    </div>
    <div v-else-if="errorMessage">
      {{ errorMessage }}
    </div>
    <div v-else-if="application" style="position: relative; margin: 2rem 1rem;">
      <h2>
        {{ application.label }}
        <p v-if="metadataStore.firstMetadata" class="subtitle">
          Date de création : {{ new Date(metadataStore.firstMetadata.createdAt).toLocaleDateString("fr-FR") || "inconnue" }} ({{
            metadataStore.firstMetadata.createdBy?.email
          }})
        </p>
        <p v-if="metadataStore.lastMetadata" class="subtitle">
          Dernière modification : {{ formatDate(metadataStore.lastMetadata.createdAt) || "inconnue" }} ({{ metadataStore.lastMetadata.createdBy?.email }})
        </p>
        <DsfrTag v-if="application.status" class="fr-mr-2w" :label="statusApplicationDictionary[application.status]" />
        <DsfrTag :label="`IQ: ${application.quality ?? 'non renseigné'}%`" />
      </h2>

      <DsfrButton
        v-if="userStore.adminLevel >= AdminLevel.ADMIN"
        class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-delete-line"
        style="position: absolute; top: 0; right: 0;"
        @click="opened = true"
      >
        Supprimer l’application
      </DsfrButton>
      <ApplicationOverview :application="application" @update:application="handleApplicationUpdate" />
    </div>
  </div>

  <DsfrModal
    v-model:opened="opened"
    title="Supprimer définitivement l’application"
    :actions="actions"
    @close="resetModal"
  >
    <DsfrAlert
      title="Cette action est irréversible"
      :description="`Cela concerne l'application ainsi que toutes ses données. Pour confirmer, veuillez retaper le nom de l’application : ${appName}`"
      type="warning"
      class="fr-mb-3w"
    />
    <DsfrInput
      v-model="confirmationInput"
      type="text"
      placeholder="Nom de l’application"
      @input="updateActions"
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
