<script setup lang="ts">
import { ref } from "vue";
import axios from "axios";
import useToaster from "@/composables/use-toaster";
import useModal from "@/composables/use-modal";
import type { Application } from "@/models/Application";
import { useUserStore } from "@/stores/userStore";

const toaster = useToaster();
const applicationModal = useModal();
const isSubmitting = ref(false);
const userStore = useUserStore();

async function createApplication(newApplication: Application) {
  try {
    applicationModal.closeModal();
    await axios.post<Application>(`/applications/`, newApplication);
    toaster.addSuccessMessage("Application créée avec succès !");
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la création de l'application.");
  }
}
</script>

<template>
  <div class="app-container fr-container fr-my-2v">
    <DsfrButton
      type="button"
      class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-add-line"
      @click="applicationModal.openCreateModal()"
      :disabled="!userStore.userPermissions?.includes('write')"
    >
      Créer une application
    </DsfrButton>

    <DsfrModal
      size="lg"
      :opened="applicationModal.isCreateModalOpen.value"
      :title="'Créer une application'"
      @close="applicationModal.closeModal"
    >
      <ApplicationInfoForm :is-submitting="isSubmitting" @submit="createApplication" @cancel="applicationModal.closeModal" />
    </DsfrModal>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  justify-content: flex-end;
}
</style>
