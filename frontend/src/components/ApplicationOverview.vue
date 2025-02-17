<script setup lang="ts">
import { ref, watch } from "vue";
import InformationsGenerales from "./InformationsGenerales.vue";
import NotificationsApplication from "./NotificationsApplication.vue";
import Links from "./Links.vue";
import ActorManager from "./ActorManager.vue";
import Compliances from "./Compliances.vue";
import type { Application } from "@/models/Application";
import useToaster from "@/composables/use-toaster";
import Applications from "@/api/application";

const props = defineProps<{ application: Application }>();
const emit = defineEmits(["update:application"]);
const application = ref<Application>(props.application);
const activeTab = ref(0);

const isSubmitting = ref(false);
const toaster = useToaster();

watch(
  () => props.application,
  (newVal) => {
    application.value = newVal;
  },
);

// Gestion des modals pour chaque onglet
const isEditModalOpen = ref(false);
const currentEditTab = ref<number | null>(null);

// Modal management
// Fonction pour ouvrir la modal et définir l'onglet en cours d'édition
const openEditModal = (tabIndex: number) => {
  currentEditTab.value = tabIndex;
  isEditModalOpen.value = true;
};

// Fonction pour fermer la modal
const closeEditModal = () => {
  isEditModalOpen.value = false;
  currentEditTab.value = null;
};

async function updateApplication(updatedData) {
  if (!application.value) return;

  isSubmitting.value = true;
  try {
    await Applications.patchApplication({ ...application.value, ...updatedData });
    toaster.addSuccessMessage("Application mise à jour avec succès");
    closeEditModal();
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la mise à jour de l'application");
  } finally {
    isSubmitting.value = false;
  }
}

const applicationTabListName = "Informations sur l’application";
const tabTitles = [
  { title: "Informations générales", icon: "ri-checkbox-circle-line", tabId: "tab-0", panelId: "tab-content-0" },
  {
    title: "Liens",
    icon: "ri-links-line",
    tabId: "tab-1",
    panelId: "tab-content-1",
  },
  {
    title: "Conformités",
    icon: "ri-shield-check-line",
    tabId: "tab-2",
    panelId: "tab-content-2",
  },
  {
    title: "Acteurs",
    icon: "ri-team-line",
    tabId: "tab-3",
    panelId: "tab-content-3",
  },
  { title: "Signalements", icon: "ri-alert-line", tabId: "tab-4", panelId: "tab-content-4" },
];
</script>
<template>
  <DsfrTabs v-model="activeTab" :tab-list-name="applicationTabListName">
    <template #tab-items>
      <DsfrTabItem
        v-for="(tab, index) in tabTitles"
        :key="tab.tabId"
        :tab-id="tab.tabId"
        :panel-id="tab.panelId"
        :icon="tab.icon"
        @click="activeTab = index"
      >
        {{ tab.title }}
      </DsfrTabItem>
    </template>

    <DsfrTabContent v-if="activeTab === 0" panel-id="tab-content-0" tab-id="tab-0">
      <InformationsGenerales :application="application" @edit="openEditModal(0)" />
    </DsfrTabContent>

    <DsfrTabContent v-if="activeTab === 1" panel-id="tab-content-1" tab-id="tab-1">
      <Links :application="application" @edit="openEditModal(1)" />
    </DsfrTabContent>

    <DsfrTabContent v-if="activeTab === 2" panel-id="tab-content-2" tab-id="tab-2">
      <Compliances :application="application" @edit="openEditModal(2)" />
    </DsfrTabContent>

    <DsfrTabContent v-if="activeTab === 3" panel-id="tab-content-3" tab-id="tab-3">
      <ActorManager :application="application" @edit="openEditModal(3)" />
    </DsfrTabContent>

    <DsfrTabContent v-if="activeTab === 4" panel-id="tab-content-4" tab-id="tab-4">
      <NotificationsApplication :application="application" @edit="openEditModal(4)" />
    </DsfrTabContent>
  </DsfrTabs>

  <!-- Modal unique réutilisable pour toutes les modifications -->
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
