<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useToasterStore } from "@/stores/toasterStore";
import useModal from "@/composables/use-modal";
import { useUserStore } from "@/stores/userStore";
import { AdminLevel } from "@/models/user";
import api from "@/api/index";
import type { ApplicationDto, CreateApplicationDto } from "@/client/types.gen";

const toaster = useToasterStore();
const applicationModal = useModal();
const isSubmitting = ref(false);
const userStore = useUserStore();
const router = useRouter();

async function createApplication(newApplication: CreateApplicationDto) {
  try {
    applicationModal.closeModal();
    const response = await api.applicationControllerCreate({ body: newApplication });
    const createdApp = response.data as ApplicationDto;

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
      data-testid="create-application-btn"
      @click="applicationModal.openCreateModal()"
    >
      Créer une application
    </DsfrButton>

    <DsfrModal
      size="lg"
      :opened="applicationModal.isCreateModalOpen.value"
      title="Créer une application"
      data-testid="create-application-modal"
      @close="applicationModal.closeModal"
    >
      <ApplicationInfoForm :is-submitting="isSubmitting" data-testid="create-application-form" @submit="createApplication" @cancel="applicationModal.closeModal" />
    </DsfrModal>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  justify-content: flex-end;
}
</style>
