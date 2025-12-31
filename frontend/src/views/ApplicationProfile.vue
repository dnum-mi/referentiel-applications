<script setup lang="ts">
import type { Application, ApplicationWithPerms } from "@/models/Application";
import ApplicationOverview from "@/components/ApplicationOverview.vue";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { formatDateFR } from "@/composables/use-date";
import { statusApplicationDictionary, typeApplicationDictionary } from "@/composables/use-dictionary";
import { useApplicationStore } from "@/stores/applicationStore";
import { useMetadataStore } from "@/stores/metadataStore";
import { useUserStore } from "@/stores/userStore";
import { AdminLevel } from "@/models/user";
import { useBreakpoints } from "@/composables/use-breakpoint";
import { BREAKPOINTS } from "@/constants/breakpoint";
import type { ApplicationType } from "@/client";

const userStore = useUserStore();
const applicationStore = useApplicationStore();
const metadataStore = useMetadataStore();
const route = useRoute();
const id = route.params.id as string;
const application = computed<ApplicationWithPerms>(() => applicationStore.applicationsById[id]);
const isLoading = ref(false);
const errorMessage = ref("");

const isSubscriptionLoading = ref(false);
const isSubscribed = computed(() => userStore.isSubscribed(id));

const TypeOptions = computed(() =>
  Object.entries(typeApplicationDictionary).map(([value, text]) => ({
    value: value as ApplicationType,
    text,
  })),
);

async function toggleSubscription() {
  isSubscriptionLoading.value = true;
  try {
    if (isSubscribed.value) {
      await userStore.unsubscribeFromApp(id);
    } else {
      await userStore.subscribeToApp(id);
    }
  } catch (err) {
    console.error("Erreur lors de la modification de l'abonnement", err);
  } finally {
    isSubscriptionLoading.value = false;
  }
}

const deleteModalOpened = ref(false);
const deleteConfirmationInput = ref("");
const applicationLabel = computed(() => application.value?.label ?? "");

const { smaller: isMobile } = useBreakpoints({
  mobile: BREAKPOINTS.MOBILE_MAX,
});

const canReadMetadata = computed(() => {
  return application.value?.myPerms?.has("readMetadata") || userStore.adminLevel >= AdminLevel.READ;
});

async function handleApplicationUpdate(updateData: Application) {
  await applicationStore.fetchApplication(id);
  if (canReadMetadata.value) {
    await metadataStore.getFirstAndLastMetadataByApplication(updateData.id);
  }
}

async function loadApplication() {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    await applicationStore.fetchApplication(id);
    if (canReadMetadata.value) {
      await metadataStore.getFirstAndLastMetadataByApplication(id);
    }
  } catch (err) {
    console.error("Failed to load application:", err);
    errorMessage.value = "Impossible de charger les données de l'application.";
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  loadApplication();
});

function resetModal() {
  deleteModalOpened.value = false;
  deleteConfirmationInput.value = "";
}

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
    <div v-if="isLoading" data-testid="application-loading" role="status" aria-live="polite" aria-atomic="true">
      <AppLoader></AppLoader>
    </div>

    <div v-else-if="errorMessage" data-testid="application-error" role="alert" class="fr-alert fr-alert--error fr-m-2w">
      {{ errorMessage }}
    </div>

    <div
      v-else-if="application"
      class="application-profile"
      data-testid="application-profile"
      style="position: relative; margin: 2rem 1rem"
      aria-labelledby="application-title"
    >
      <h1 id="application-title" data-testid="application-title" class="application-title">
        {{ application.label }}
      </h1>

      <DsfrHighlight
        v-if="metadataStore.firstMetadata || metadataStore.lastMetadata"
        class="metadata-highlight"
        data-testid="application-metadata-highlight"
      >
        <template #default>
          <div class="metadata-content">
            <p v-if="metadataStore.firstMetadata" class="subtitle" data-testid="application-created-at">
              Date de création de la fiche :
              {{ formatDateFR(metadataStore.firstMetadata.createdAt) || "inconnue" }}
              ({{ metadataStore.firstMetadata.createdBy?.email ?? "inconnu" }})
            </p>

            <p v-if="metadataStore.lastMetadata" class="subtitle" data-testid="application-updated-at">
              Dernière modification de la fiche :
              {{ formatDateFR(metadataStore.lastMetadata.createdAt) || "inconnue" }}
              ({{ metadataStore.lastMetadata.createdBy?.email ?? "inconnu" }})
            </p>
          </div>
        </template>
      </DsfrHighlight>
      <DsfrButton
        class="fr-btn--tertiary-no-outline fr-btn--icon-left"
        :class="isSubscribed ? 'fr-icon-notification-3-fill' : 'fr-icon-notification-3-line'"
        :disabled="isSubscriptionLoading"
        @click="toggleSubscription"
        :title="
          isSubscribed ? 'Ne plus recevoir de notifications pour cette application' : 'Recevoir des notifications lors des modifications'
        "
      >
        {{ isSubscribed ? "Abonné(e)" : "S'abonner" }}
      </DsfrButton>
      <div class="status-tags" aria-hidden="false" data-testid="application-tags">
        <DsfrTag
          v-if="application.currentStatus?.statusDate"
          class="fr-mr-2w"
          :label="`${statusApplicationDictionary[application.currentStatus?.status]} depuis le ${formatDateFR(application.currentStatus?.statusDate)}`"
          data-testid="application-status-tag"
        ></DsfrTag>

        <DsfrTag :label="`IQ: ${application.quality ?? 'non renseigné'}%`" data-testid="application-iq-tag"></DsfrTag>

        <DsfrTag
          v-if="application.type"
          :label="`Type: ${typeApplicationDictionary[application.type]}`"
          data-testid="application-type-tag"
        ></DsfrTag>
      </div>

      <ApplicationOverview
        :application="application"
        data-testid="application-overview"
        @update:application="handleApplicationUpdate"
      ></ApplicationOverview>

      <DsfrButton
        v-if="userStore.adminLevel >= AdminLevel.ADMIN"
        class="application-delete-btn fr-btn--secondary fr-btn--icon-left fr-icon-delete-line"
        data-testid="application-delete-btn"
        title="Supprimer définitivement cette application"
        aria-label="Supprimer définitivement cette application"
        @click="deleteModalOpened = true"
      >
        Supprimer l’application
      </DsfrButton>
    </div>

    <DsfrModal
      :opened="deleteModalOpened"
      title="Supprimer définitivement l’application"
      :actions="actions"
      data-testid="application-delete-modal"
      @close="resetModal"
      aria-labelledby="application-delete-modal-title"
    >
      <DsfrAlert
        id="application-delete-alert"
        title="Cette action est irréversible"
        :description="`Cela concerne l'application ainsi que toutes ses données. Pour confirmer, veuillez retaper le nom de l’application : ${applicationLabel}`"
        type="warning"
        class="fr-mb-3w"
        data-testid="application-delete-alert"
      ></DsfrAlert>

      <DsfrInput
        v-model="deleteConfirmationInput"
        type="text"
        placeholder="Nom de l’application"
        data-testid="application-delete-input"
        title="Entrez le nom de l’application pour confirmer"
        aria-label="Entrer le nom de l’application pour confirmer"
        :aria-describedby="'application-delete-alert'"
      ></DsfrInput>
    </DsfrModal>
  </div>
</template>

<style scoped>
.application-profile {
  position: relative;
  padding-bottom: 1rem;
}

.subtitle {
  font-weight: 600;
  font-size: 1rem;
  color: #666;
  margin: 0.25rem 0;
}

.status-tags {
  margin: 1rem;
}

.application-delete-btn {
  position: static;
  margin-top: 1rem;
}

@media (min-width: 769px) {
  .application-delete-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    margin-top: 0;
  }
}

@media (max-width: 768px) {
  .application-delete-btn {
    width: 100%;
  }

  .metadata-highlight {
    margin-bottom: 1rem;
  }
}

.metadata-highlight .metadata-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sr-only {
  position: absolute !important;
  height: 1px;
  width: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap;
  border: 0;
  padding: 0;
  margin: -1px;
}
</style>
