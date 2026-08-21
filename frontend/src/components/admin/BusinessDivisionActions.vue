<script setup lang="ts">
import { ref } from "vue";
import type { BusinessDivisionDto } from "@/client/types.gen";
import { useToasterStore } from "@/stores/toasterStore";
import api from "@/api";

const props = defineProps<{
  businessDivision?: BusinessDivisionDto;
}>();

const emit = defineEmits<{
  fetchBusinessDivisions: [];
}>();

const toaster = useToasterStore();

const isEditModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const editingLabel = ref<string>("");
const errorMessage = ref<string>("");

function openEditModal() {
  editingLabel.value = props.businessDivision?.label || "";
  errorMessage.value = "";
  isEditModalOpen.value = true;
}

function openDeleteModal() {
  isDeleteModalOpen.value = true;
}

function closeEditModal() {
  isEditModalOpen.value = false;
  errorMessage.value = "";
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
}

async function saveBusinessDivision() {
  const label = editingLabel.value.trim();
  if (!label) {
    errorMessage.value = "Le nom de la direction métier est obligatoire.";
    return;
  }

  isSaving.value = true;
  errorMessage.value = "";

  const body = { label };

  const response = props.businessDivision?.id
    ? await api.businessDivisionControllerUpdate({ path: { id: props.businessDivision.id }, body })
    : await api.businessDivisionControllerCreate({ body });

  if (response.response.ok) {
    toaster.addSuccessMessage(
      props.businessDivision?.id ? "Direction métier mise à jour avec succès" : "Direction métier créée avec succès",
    );
    closeEditModal();
    emit("fetchBusinessDivisions");
  } else if (response.response.status === 409) {
    errorMessage.value = "Une direction métier existe déjà avec ce nom.";
  } else if (response.response.status === 400) {
    errorMessage.value = "Les informations saisies sont incorrectes.";
  } else {
    errorMessage.value = "Erreur lors de la sauvegarde de la direction métier.";
  }
  isSaving.value = false;
}

async function deleteBusinessDivision() {
  if (!props.businessDivision?.id) return;

  isDeleting.value = true;

  const response = await api.businessDivisionControllerRemove({ path: { id: props.businessDivision.id } });
  if (response.response.ok) {
    toaster.addSuccessMessage("Direction métier supprimée avec succès");
    closeDeleteModal();
    emit("fetchBusinessDivisions");
  } else {
    toaster.addErrorMessage("Erreur lors de la suppression de la direction métier");
  }
  isDeleting.value = false;
}
</script>

<template>
  <DsfrButton
    v-if="!businessDivision?.id"
    class="fr-btn--icon-left fr-icon-add-line"
    label="Créer une direction métier"
    data-testid="admin-create-business-division-btn"
    title="Créer une nouvelle direction métier"
    aria-label="Créer une nouvelle direction métier"
    @click="openEditModal"
  />

  <div v-else class="button-row">
    <DsfrButton
      label="Modifier"
      size="sm"
      secondary
      data-testid="admin-business-division-edit-btn"
      title="Modifier la direction métier"
      aria-label="Modifier la direction métier"
      @click="openEditModal"
    />
    <DsfrButton
      label="Supprimer"
      size="sm"
      secondary
      data-testid="admin-business-division-delete-btn"
      title="Supprimer la direction métier"
      aria-label="Supprimer la direction métier"
      @click="openDeleteModal"
    />
  </div>

  <DsfrModal
    :opened="isEditModalOpen"
    :title="!businessDivision?.id ? 'Créer une direction métier' : `Modifier la direction métier ${businessDivision?.label}`"
    :data-testid="!businessDivision?.id ? 'admin-create-business-division-modal' : 'admin-edit-business-division-modal'"
    @close="closeEditModal"
  >
    <p class="fr-text--sm fr-hint-text fr-mb-3w" style="white-space: normal">
      Une direction métier regroupe des organisations et des applications sous une même entité métier. Son nom doit être unique.
    </p>

    <DsfrAlert
      v-if="errorMessage"
      type="error"
      :description="errorMessage"
      small
      class="fr-mb-3w"
      data-testid="business-division-form-error"
    />

    <DsfrInputGroup
      v-model="editingLabel"
      class="fr-mb-3w"
      label="Nom de la direction métier"
      hint="Nom unique de la direction métier (ex. dgpn)"
      label-visible
      required
      data-testid="business-division-label"
    />

    <template #footer>
      <DsfrButtonGroup :inline-layout-when="true" :reverse="true">
        <DsfrButton
          label="Annuler"
          secondary
          data-testid="admin-business-division-cancel-btn"
          title="Annuler"
          aria-label="Annuler"
          @click="closeEditModal"
        />
        <DsfrButton
          :label="isSaving ? 'Enregistrement…' : 'Enregistrer'"
          title="Enregistrer"
          aria-label="Enregistrer"
          :disabled="isSaving"
          data-testid="admin-business-division-save-btn"
          @click="saveBusinessDivision"
        />
      </DsfrButtonGroup>
    </template>
  </DsfrModal>

  <DsfrModal
    :opened="isDeleteModalOpen"
    title="Supprimer la direction métier"
    data-testid="admin-delete-business-division-modal"
    @close="closeDeleteModal"
  >
    <DsfrAlert
      id="business-division-delete-alert"
      title="Cette action est irréversible"
      :description="`Êtes-vous sûr de vouloir supprimer la direction métier : ${businessDivision?.label} ? Les organisations et applications liées ne seront pas supprimées, seulement détachées.`"
      type="warning"
      class="fr-mb-3w alert-multiline"
      data-testid="business-division-delete-alert"
    />

    <template #footer>
      <DsfrButtonGroup :inline-layout-when="true" :reverse="true">
        <DsfrButton
          label="Annuler"
          secondary
          data-testid="admin-business-division-delete-cancel-btn"
          title="Annuler la suppression"
          aria-label="Annuler la suppression"
          @click="closeDeleteModal"
        />
        <DsfrButton
          label="Supprimer"
          data-testid="admin-business-division-delete-confirm-btn"
          title="Confirmer la suppression"
          aria-label="Confirmer la suppression"
          danger
          :disabled="isDeleting"
          @click="deleteBusinessDivision"
        />
      </DsfrButtonGroup>
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
