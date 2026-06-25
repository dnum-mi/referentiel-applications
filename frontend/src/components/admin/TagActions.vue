<script setup lang="ts">
import { ref } from "vue";
import type { TagDto } from "@/client/types.gen";
import { useToasterStore } from "@/stores/toasterStore";
import api from "@/api";

interface BadRequestResponse {
  error: string;
  message: string[];
  statusCode: number;
}

const props = defineProps<{
  tag?: TagDto;
}>();

const emit = defineEmits<{
  fetchTags: [];
}>();

const toaster = useToasterStore();

const isEditModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const editingName = ref<string>("");
const errorMessage = ref<string>("");

async function openEditModal() {
  editingName.value = props.tag?.name || "";
  errorMessage.value = "";
  isEditModalOpen.value = true;
}

async function openDeleteModal() {
  isDeleteModalOpen.value = true;
}

function closeEditModal() {
  isEditModalOpen.value = false;
  editingName.value = "";
  errorMessage.value = "";
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
}

async function saveTag() {
  isSaving.value = true;
  errorMessage.value = "";

  const response = props.tag?.id
    ? await api.tagsControllerUpdate({
        path: { id: props.tag.id },
        body: {
          name: editingName.value,
        },
      })
    : await api.tagsControllerCreate({
        body: {
          name: editingName.value,
        },
      });

  if (response.response.ok) {
    toaster.addSuccessMessage(props.tag?.id ? "Tag mis à jour avec succès" : "Tag créé avec succès");

    closeEditModal();
    emit("fetchTags");
  } else {
    if (response.response.status === 400) {
      const error = response.error as BadRequestResponse;
      errorMessage.value = error.message.join(", ");
    } else {
      errorMessage.value = "Erreur lors de la sauvegarde du tag";
    }
  }
  isSaving.value = false;
}

async function deleteTag() {
  if (!props.tag?.id) return;

  isDeleting.value = true;

  const response = await api.tagsControllerDelete({ path: { id: props.tag.id } });
  if (response.response.ok) {
    toaster.addSuccessMessage("Tag supprimé avec succès");
    closeDeleteModal();
    emit("fetchTags");
  } else {
    toaster.addErrorMessage("Erreur lors de la suppression du tag");
  }
  isDeleting.value = false;
}
</script>

<template>
  <DsfrButton
    v-if="!tag?.id"
    class="fr-btn--icon-left fr-icon-add-line"
    label="Créer un tag"
    data-testid="admin-create-tag-btn"
    title="Créer un nouveau tag"
    aria-label="Créer un nouveau tag"
    @click="openEditModal"
  />

  <div v-else class="button-row">
    <DsfrButton
      label="Modifier"
      size="sm"
      secondary
      data-testid="admin-tag-edit-btn"
      title="Modifier le tag"
      aria-label="Modifier le tag"
      @click="openEditModal"
    />
    <DsfrButton
      label="Supprimer"
      size="sm"
      secondary
      data-testid="admin-tag-delete-btn"
      title="Supprimer le tag"
      aria-label="Supprimer le tag"
      @click="openDeleteModal"
    />
  </div>

  <DsfrModal
    :opened="isEditModalOpen"
    :title="!tag?.id ? 'Créer un tag' : 'Modifier le tag'"
    :data-testid="!tag?.id ? 'admin-create-tag-modal' : 'admin-edit-tag-modal'"
    @close="closeEditModal"
  >
    <DsfrInputGroup
      v-model="editingName"
      class="fr-mb-2w"
      label="Nom du tag"
      hint="Les tags sont en minuscules"
      label-visible
      required
      :error-message="errorMessage"
      data-testid="tag-name"
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
        :disabled="isSaving"
        data-testid="admin-save-perms-btn"
        @click="saveTag"
      />
    </template>
  </DsfrModal>

  <DsfrModal :opened="isDeleteModalOpen" title="Supprimer le tag" data-testid="admin-delete-tag-modal" @close="closeDeleteModal">
    <DsfrAlert
      id="tag-delete-alert"
      title="Cette action est irréversible"
      :description="`Il sera retiré de toutes les applications liées. Êtes-vous sûr de vouloir supprimer le tag : ${tag?.name} ?`"
      type="warning"
      class="fr-mb-3w alert-multiline"
      data-testid="tag-delete-alert"
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
        @click="deleteTag"
      />
    </template>
  </DsfrModal>
</template>

<style scoped>
.truncate {
  display: inline-block;
  max-width: 60ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.button-row {
  display: flex;
  gap: 1rem;
}

.alert-multiline {
  white-space: normal;
  word-wrap: break-word;
}
</style>
