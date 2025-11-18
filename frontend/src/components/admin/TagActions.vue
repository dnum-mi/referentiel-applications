<script setup lang="ts">
import { ref } from "vue";
import type { Tag } from "@/client/types.gen";
import { useToasterStore } from "@/stores/toasterStore";
import { useTagStore } from "@/stores/tagStore";

const props = defineProps<{ 
  tag: Partial<Tag>, 
  isCreating?: boolean
}>();

const emit = defineEmits<{
  tagUpdated: [tag: Tag]
}>();

const toaster = useToasterStore();
const tagStore = useTagStore();

const isEditModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const editingName = ref<string>("");
const TAG_REGEX = /^[a-z._-]+$/;

async function openEditModal() {
  editingName.value = props.tag.name || "";
  isEditModalOpen.value = true;
}

async function openDeleteModal() {
  isDeleteModalOpen.value = true;
}

function closeEditModal() {
  isEditModalOpen.value = false;
  editingName.value = "";
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
}

async function saveTag() {
  if (!TAG_REGEX.test(editingName.value)) {
    toaster.addErrorMessage(
      "Le nom du tag doit contenir uniquement des minuscules ou les caractères '.', '_' et '-'"
    );
    return;
  }

  if (editingName.value.length < 2 || editingName.value.length > 128) {
    toaster.addErrorMessage("Le nom du tag doit contenir entre 2 et 128 caractères.");
    return;
  }

  isSaving.value = true;
  try {
    const response = props.isCreating
      ? await tagStore.createTag(editingName.value)
      : await tagStore.updateTag(props.tag.id, editingName.value);

    toaster.addSuccessMessage(
      props.isCreating ? "Tag créé avec succès" : "Tag mis à jour avec succès"
    );

    closeEditModal();
    emit("tagUpdated", response.data);
  } catch (err) {
    toaster.addErrorMessage("Erreur lors de la mise à jour du tag");
    console.error(err);
  } finally {
    isSaving.value = false;
  }
}

async function deleteTag() {
  isDeleting.value = true;
  try {
    const response = await tagStore.deleteTag(props.tag.id);
    toaster.addSuccessMessage("Tag supprimé avec succès");
    closeEditModal();
    emit("tagUpdated", response.data);
  } catch (err) {
    toaster.addErrorMessage("Erreur lors de la suppression du tag");
    console.error(err);
  } finally {
    isDeleting.value = false;
  }
}
</script>

<template>
  <div>
    <DsfrButton
    v-if="props.isCreating"
        class="fr-btn--icon-left fr-icon-add-line"
        label="Créer un tag"
        data-testid="admin-create-tag-btn"
        title="Créer un nouveau tag"
        aria-label="Créer un nouveau tag"
        @click="openEditModal"
      />

    <div v-if="!props.isCreating" class="button-row">
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
      :title="props.isCreating ? 'Créer un tag' : 'Modifier le tag'"
      :data-testid="props.isCreating ? 'admin-create-tag-modal' : 'admin-edit-tag-modal'"
      @close="closeEditModal"
    >
      <p v-if="!props.isCreating"><strong>Tag :</strong> {{ tag.name }}</p>

      <DsfrInput
        v-model="editingName"
        class="fr-mb-2w"
        aria-placeholder="nom du tag..."
        :initial-name="tag.name"
        data-testid="tag-name"
      />

      <template #footer>
        <DsfrButton
          label="Annuler" secondary data-testid="admin-cancel-btn"
          title="Annuler la modification"
          aria-label="Annuler la modification"
          @click="closeEditModal"
        />
        <DsfrButton
          label="Sauvegarder"
          title="Sauvegarder les modifications"
          aria-label="Sauvegarder les modifications"
          :disabled="isSaving" data-testid="admin-save-perms-btn" @click="saveTag"
        />
      </template>
    </DsfrModal>

    <DsfrModal
      :opened="isDeleteModalOpen"
      title="Supprimer le tag"
      data-testid="admin-delete-tag-modal"
      @close="closeDeleteModal"
    >
      <p>Êtes-vous sûr de vouloir supprimer le tag <strong>{{ tag.name }}</strong> ?</p>

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
  </div>
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
</style>
