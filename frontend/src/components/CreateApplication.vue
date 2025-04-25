<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import axios from "axios";
import useToaster from "@/composables/use-toaster";
import useModal from "@/composables/use-modal";
import SearchApplications from "./ApplicationTableView.vue";
import type { Application } from "@/models/Application";
import Applications from "@/api/application";
import Users from "@/api/user.js";

const toaster = useToaster();
const applicationModal = useModal();
const isSubmitting = ref(false);
const userPermissions = ref(null);

async function createApplication(newApplication: Application) {
  try {
    applicationModal.closeModal();
    await axios.post<Application>(`/applications/`, newApplication);
    toaster.addSuccessMessage("Application créée avec succès !");
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la création de l'application.");
  }
}

onMounted(async () => {
  userPermissions.value = await Users.getUser().then((response) => {
    return response.permissions.split(",");
  });
});
</script>

<template>
  <div class="app-container fr-container fr-my-2v">
    <DsfrButton
      type="button"
      class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-add-line"
      @click="applicationModal.openCreateModal()"
      :disabled="!userPermissions?.includes('write')"
    >
      Créer une application
    </DsfrButton>

    <DsfrModal :opened="applicationModal.isCreateModalOpen.value" :title="'Créer une application'" @close="applicationModal.closeModal">
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
