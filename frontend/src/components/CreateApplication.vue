<script setup lang="ts">
import { ref } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";
import useToaster from "@/composables/use-toaster";
import useModal from "@/composables/use-modal";
import type { Application } from "@/models/Application";
import { useUserStore } from "@/stores/userStore";
import { AdminLevel } from "@/models/user";

const toaster = useToaster();
const applicationModal = useModal();
const isSubmitting = ref(false);
const userStore = useUserStore();
const router = useRouter();

async function createApplication(newApplication: Application) {
  try {
    applicationModal.closeModal();
    const response = await axios.post<Application>("/applications/", newApplication);
    const createdApp = response.data;

    toaster.addSuccessMessage("Application créée avec succès !");
    router.push({ name: "application", params: { id: createdApp.id } });
  } catch (_error) {
    console.error("Erreur lors de la création de l'application:", _error);
    toaster.addErrorMessage("Erreur lors de la création de l'application.");
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="app-container fr-container fr-my-2v">
    <DsfrButton
      type="button"
      class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-add-line"
      :disabled="userStore.adminLevel < AdminLevel.WRITE"
      @click="applicationModal.openCreateModal()"
    >
      Créer une application
    </DsfrButton>

    <DsfrModal
      size="lg"
      :opened="applicationModal.isCreateModalOpen.value"
      title="Créer une application"
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
