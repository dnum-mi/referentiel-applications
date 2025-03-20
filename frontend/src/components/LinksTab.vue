<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import axios from "axios";
import type { ExternalRessource } from "@/models/Application";
import useToaster from "@/composables/use-toaster";
import { defineProps, defineEmits } from "vue";
import { linkTypesDict } from "@/composables/use-dictionary";
import LinkForm from "./form/LinkForm.vue";
import useModal from "@/composables/use-modal";

const toaster = useToaster();
const linkModal = useModal();

const props = defineProps({
  application: {
    type: Object,
    required: true,
  },
});

const links = ref<ExternalRessource[]>([]);
const selectedLinkIds = ref<string[]>([]);
const showDeleteConfirmation = ref(false);
const loading = ref(false);
const isSubmitting = ref(false);
const currentPage = ref(0);

const headers = ["Sélection", "Lien", "Description", "Type de lien", "Actions"];
const rows = ref<(string | { component: string; [k: string]: unknown })[][]>([]);

const getTypeLabel = (value: string): string => linkTypesDict[value] || "Type inconnu";
const formatLink = (url: string): string => (!url || !url.startsWith("http") ? `http://${url}` : url);

const updateRows = () => {
  rows.value = links.value.map((link) => [
    link.id,
    { label: link.link || "Lien vide", to: formatLink(link.link) },
    link.description || "Description vide",
    getTypeLabel(link.type),
    {
      component: "DsfrButton",
      label: "Modifier",
      onClick: () => linkModal.openModal(link),
    },
  ]);
};

const getLinks = async () => {
  loading.value = true;
  try {
    const response = await axios.get(`applications/${props.application.id}/links`);
    links.value = response.data;
    updateRows();
  } catch {
    toaster.addErrorMessage("Erreur lors de la récupération des liens.");
  } finally {
    loading.value = false;
  }
};

const createLink = async (newLink) => {
  try {
    const linkToSend = {
      link: newLink.link ? formatLink(newLink.link) : undefined,
      description: newLink.description,
      type: newLink.type,
    };
    linkModal.closeModal();
    await axios.post(`applications/${props.application.id}/links`, linkToSend);
    toaster.addSuccessMessage("Lien créé avec succès !");
    getLinks();
  } catch {
    toaster.addErrorMessage("Erreur lors de la création du lien.");
  }
};

const editLink = async (updatedLink) => {
  try {
    const linkToSend = {
      link: updatedLink.link ? formatLink(updatedLink.link) : undefined,
      description: updatedLink.description,
      type: updatedLink.type,
    };
    linkModal.closeModal();
    await axios.patch(`applications/${props.application.id}/links/${updatedLink.id}`, linkToSend);
    toaster.addSuccessMessage("Lien modifié avec succès !");
    getLinks();
  } catch {
    toaster.addErrorMessage("Erreur lors de la modification du lien.");
  }
};

const deleteLinks = async (linkIds: string[]) => {
  try {
    await Promise.all(linkIds.map((linkId) => axios.delete(`applications/${props.application.id}/links/${linkId}`)));
    toaster.addSuccessMessage("Liens supprimés avec succès !");
    getLinks();
  } catch {
    toaster.addErrorMessage("Erreur lors de la suppression des liens.");
  }
};

const removeSelectedLinks = () => {
  if (!selectedLinkIds.value.length) {
    toaster.addErrorMessage("Aucune sélection.");
    return;
  }
  showDeleteConfirmation.value = true;
};

const confirmDelete = async () => {
  if (selectedLinkIds.value.length) {
    await deleteLinks(selectedLinkIds.value);
    showDeleteConfirmation.value = false;
    selectedLinkIds.value = [];
  }
};

onMounted(getLinks);

watch(links, updateRows, { deep: true });
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
    <div class="fr-col">
      <h3 class="fr-mb-0">Gestions des liens</h3>
    </div>
    <div class="fr-col-auto">
      <DsfrButton type="button" class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-add-line" @click="linkModal.openCreateModal()">
        Ajouter un lien
      </DsfrButton>
    </div>
  </div>
  <div v-if="!loading && rows.length === 0" class="text-center">
    <p>Aucun lien enregistré.</p>
  </div>
  <div v-else>
    <div class="global-delete">
      <DsfrButton type="button" tertiary @click="removeSelectedLinks" icon="fr-icon-delete-line" :disabled="!selectedLinkIds.length">
        Supprimer la sélection
      </DsfrButton>
    </div>
    <AppLoader v-if="loading"></AppLoader>
    <DsfrDataTable
      v-else
      v-model:selection="selectedLinkIds"
      v-model:current-page="currentPage"
      :headers-row="headers"
      :rows="rows"
      row-key="id"
      title="Liste des liens associés"
      pagination
      :rows-per-page="5"
      :pagination-options="[5, 10, 20, 30]"
    >
      <template #cell="{ colKey, cell }">
        <template v-if="colKey === 'Sélection'">
          <input type="checkbox" :value="cell" v-model="selectedLinkIds" />
        </template>
        <template v-else-if="colKey === 'Lien'">
          <a :href="cell.to" target="_blank" rel="noopener noreferrer">{{ cell.label }}</a>
        </template>
        <template v-else-if="colKey === 'Actions'">
          <DsfrButton tertiary size="sm" icon="fr-icon-edit-line" @click="cell.onClick">{{ cell.label }}</DsfrButton>
        </template>
        <template v-else>
          {{ cell }}
        </template>
      </template>
    </DsfrDataTable>
  </div>

  <DsfrModal
    :opened="linkModal.isModalOpen.value || linkModal.isCreateModalOpen.value"
    :title="linkModal.isCreateModalOpen.value ? 'Ajouter un lien' : 'Modifier le lien'"
    @close="linkModal.closeModal"
  >
    <LinkForm
      v-bind="{ initialData: linkModal.selectedItem.value }"
      :is-submitting="isSubmitting"
      @submit="(formData) => (linkModal.selectedItem.value ? editLink(formData) : createLink(formData))"
      @cancel="linkModal.closeModal"
    />
  </DsfrModal>

  <DeleteConfirmationModal
    :opened="showDeleteConfirmation"
    itemName="liens"
    @confirm="confirmDelete"
    @cancel="() => (showDeleteConfirmation.value = false)"
  />
</template>

<style scoped>
input[type="checkbox"] {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 2px solid var(--dsfr-border, #ccc);
  position: relative;
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;
}
</style>
