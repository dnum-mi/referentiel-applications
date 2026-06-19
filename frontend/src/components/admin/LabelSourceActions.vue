<script setup lang="ts">
import { ref } from "vue";
import type { LabelSourceDto } from "@/client/types.gen";
import { useToasterStore } from "@/stores/toasterStore";
import api from "@/api";

const props = defineProps<{
  labelSource?: LabelSourceDto;
}>();

const emit = defineEmits<{
  fetchLabelSources: [];
}>();

const toaster = useToasterStore();

const isEditModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const editingSource = ref<string>("");
const errorMessage = ref<string>("");

async function openEditModal() {
  editingSource.value = props.labelSource?.source || "";
  errorMessage.value = "";
  isEditModalOpen.value = true;
}

async function openDeleteModal() {
  isDeleteModalOpen.value = true;
}

function closeEditModal() {
  isEditModalOpen.value = false;
  editingSource.value = "";
  errorMessage.value = "";
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
}

async function saveLabelSource() {
  isSaving.value = true;
  errorMessage.value = "";

  const response = !props.labelSource?.id
    ? await api.labelSourceControllerCreate({
        body: {
          source: editingSource.value,
        },
      })
    : await api.labelSourceControllerUpdate({
        path: { id: props.labelSource.id },
        body: {
          source: editingSource.value,
        },
      });

  if (!response.response.ok) {
    if (response.response.status === 400) {
      errorMessage.value = "La valeur est incorrecte.";
    } else {
      errorMessage.value = "Erreur lors de la sauvegarde de la source";
    }
  } else {
    toaster.addSuccessMessage(!props.labelSource?.id ? "Source créée avec succès" : "Source mise à jour avec succès");

    closeEditModal();
    emit("fetchLabelSources");
  }
  isSaving.value = false;
}

async function deleteLabelSource() {
  if (!props.labelSource?.id) return;

  isDeleting.value = true;

  const response = await api.labelSourceControllerRemove({ path: { id: props.labelSource.id } });
  if (!response.response.ok) {
    toaster.addErrorMessage("Erreur lors de la suppression de la source");
  } else {
    toaster.addSuccessMessage("Source supprimée avec succès");
    closeDeleteModal();
    emit("fetchLabelSources");
  }
  isDeleting.value = false;
}
</script>

<template>
  <DsfrButton
    v-if="!labelSource?.id"
    class="fr-btn--icon-left fr-icon-add-line"
    label="Créer une source"
    data-testid="admin-create-label-source-btn"
    title="Créer une nouvelle source"
    aria-label="Créer une nouvelle source"
    @click="openEditModal"
  />

  <div v-else class="button-row">
    <DsfrButton
      label="Modifier"
      size="sm"
      secondary
      data-testid="admin-label-source-edit-btn"
      title="Modifier la source"
      aria-label="Modifier la source"
      @click="openEditModal"
    />
    <DsfrButton
      label="Supprimer"
      size="sm"
      secondary
      data-testid="admin-label-source-delete-btn"
      title="Supprimer la source"
      aria-label="Supprimer la source"
      @click="openDeleteModal"
    />
  </div>

  <DsfrModal
    :opened="isEditModalOpen"
    :title="!labelSource?.id ? 'Créer une source' : 'Modifier la source'"
    :data-testid="!labelSource?.id ? 'admin-create-label-source-modal' : 'admin-edit-label-source-modal'"
    @close="closeEditModal"
  >
    <DsfrInputGroup
      v-model="editingSource"
      class="fr-mb-2w"
      label="Valeur de la source"
      hint="Les sources sont en majuscules"
      label-visible
      required
      :error-message="errorMessage"
      data-testid="label-source-source"
    />

    <template #footer>
      <DsfrButton
        label="Annuler"
        secondary
        data-testid="admin-cancel-btn"
        title="Annuler la modification"
        aria-label="Annuler la modification"
        @click="closeEditModal"
      />
      <DsfrButton
        label="Enregistrer"
        title="Enregistrer les modifications"
        aria-label="Enregistrer les modifications"
        :disabled="isSaving || !editingSource.trim()"
        data-testid="admin-save-perms-btn"
        @click="saveLabelSource"
      />
    </template>
  </DsfrModal>

  <DsfrModal
    :opened="isDeleteModalOpen"
    title="Supprimer la source"
    data-testid="admin-delete-label-source-modal"
    @close="closeDeleteModal"
  >
    <DsfrAlert
      id="label-source-delete-alert"
      title="Cette action est irréversible"
      :description="`Cela concerne la source ainsi que tous ses noms alternatifs. Êtes-vous sûr de vouloir supprimer la source : ${labelSource?.source} ?`"
      type="warning"
      class="fr-mb-3w alert-multiline"
      data-testid="label-source-delete-alert"
    />

    <template #footer>
      <DsfrButton
        label="Annuler"
        secondary
        data-testid="admin-delete-cancel-btn"
        title="Annuler la suppression"
        aria-label="Annuler la suppression"
        @click="closeDeleteModal"
      />

      <DsfrButton
        label="Supprimer"
        data-testid="admin-delete-confirm-btn"
        title="Confirmer la suppression"
        aria-label="Confirmer la suppression"
        danger
        :disabled="isDeleting"
        @click="deleteLabelSource"
      />
    </template>
  </DsfrModal>
</template>

<style scoped>
.button-row {
  display: flex;
  gap: 1rem;
}
.alert-multiline {
  white-space: normal;
  word-wrap: break-word;
}
</style>
