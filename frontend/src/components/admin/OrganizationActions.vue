<script setup lang="ts">
import api from "@/api";
import type {
  CreateOrganizationDto,
  CreateOrganizationMaiaReferenceDto,
  OrganizationDto,
  OrganizationMaiaReferenceDto,
  PaginatedOrganizationMaiaReferenceDto,
  PatchOrganizationDto,
} from "@/client/types.gen";
import { useToasterStore } from "@/stores/toasterStore";
import { computed, ref } from "vue";

interface BadRequestResponse {
  error: string;
  message: string[];
  statusCode: number;
}

const props = defineProps<{
  organization?: OrganizationDto;
}>();

const emit = defineEmits<{
  fetchOrganizations: [];
}>();

const toaster = useToasterStore();

const isEditModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const errorMessage = ref("");
const isCreateMode = computed(() => !props.organization?.id);
const isAddingReference = ref(false);
const referencesErrorMessage = ref("");

const maiaReferences = ref<OrganizationMaiaReferenceDto[]>([]);
const newMaiaReference = ref("");

function getInitialForm(): CreateOrganizationDto {
  return {
    path: props.organization?.path || "",
    sigle: props.organization?.sigle || "",
    url: props.organization?.url || "",
  };
}

const form = ref<CreateOrganizationDto>(getInitialForm());

async function loadMaiaReferences() {
  if (isCreateMode.value) {
    maiaReferences.value = [];
    return;
  }

  const response = await api.organizationMaiaReferencesControllerFindAll({
    query: { organizationId: props.organization!.id },
  });

  if (response.response.ok && response.data) {
    maiaReferences.value = (response.data as PaginatedOrganizationMaiaReferenceDto).results;
  }
}

function resetForm() {
  form.value = getInitialForm();
  errorMessage.value = "";
  referencesErrorMessage.value = "";
  newMaiaReference.value = "";
}

async function openEditModal() {
  await loadMaiaReferences();
  form.value = getInitialForm();
  errorMessage.value = "";
  isEditModalOpen.value = true;
}

function closeEditModal() {
  isEditModalOpen.value = false;
  resetForm();
}

function openDeleteModal() {
  isDeleteModalOpen.value = true;
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
}

function toPayload(): CreateOrganizationDto | PatchOrganizationDto {
  return {
    path: form.value.path,
    sigle: form.value.sigle || undefined,
    url: form.value.url || undefined,
  };
}

async function addMaiaReference() {
  if (isCreateMode.value || !newMaiaReference.value.trim()) {
    return;
  }

  isAddingReference.value = true;
  referencesErrorMessage.value = "";

  const payload: CreateOrganizationMaiaReferenceDto = {
    maiaRef: newMaiaReference.value.trim(),
    organizationId: props.organization!.id,
  };

  try {
    const response = await api.organizationMaiaReferencesControllerCreate({
      body: payload,
    });

    if (!response.response.ok) {
      referencesErrorMessage.value =
        response.response.status === 409 ? "Cette référence MAIA existe déjà" : "Erreur lors de l'ajout de la référence MAIA";
      return;
    }

    toaster.addSuccessMessage("Référence MAIA ajoutée avec succès");
    newMaiaReference.value = "";
    await loadMaiaReferences();
    emit("fetchOrganizations");
  } finally {
    isAddingReference.value = false;
  }
}

async function deleteMaiaReference(referenceId: string) {
  const response = await api.organizationMaiaReferencesControllerRemove({
    path: { id: referenceId },
  });

  if (!response.response.ok) {
    toaster.addErrorMessage("Erreur lors de la suppression de la référence MAIA");
    return;
  }

  toaster.addSuccessMessage("Référence MAIA supprimée avec succès");
  await loadMaiaReferences();
  emit("fetchOrganizations");
}

async function saveOrganization() {
  isSaving.value = true;
  errorMessage.value = "";

  try {
    const response = isCreateMode.value
      ? await api.organizationsControllerCreate({
          body: toPayload() as CreateOrganizationDto,
        })
      : await api.organizationsControllerUpdate({
          path: { id: props.organization!.id },
          body: toPayload() as PatchOrganizationDto,
        });

    if (!response.response.ok) {
      if (response.response.status === 400) {
        const error = response.error as BadRequestResponse;
        errorMessage.value = error.message.join(", ");
      } else {
        errorMessage.value = "Erreur lors de la sauvegarde de l'organisation";
      }
    } else {
      toaster.addSuccessMessage(isCreateMode.value ? "Organisation créée avec succès" : "Organisation mise à jour avec succès");
      closeEditModal();
      emit("fetchOrganizations");
    }
  } finally {
    isSaving.value = false;
  }
}

async function deleteOrganization() {
  if (isCreateMode.value) {
    return;
  }

  isDeleting.value = true;
  try {
    const response = await api.organizationsControllerDelete({
      path: { id: props.organization!.id },
    });

    if (!response.response.ok) {
      toaster.addErrorMessage("Erreur lors de la suppression de l'organisation");
    } else {
      toaster.addSuccessMessage("Organisation supprimée avec succès");
      closeDeleteModal();
      emit("fetchOrganizations");
    }
  } finally {
    isDeleting.value = false;
  }
}
</script>

<template>
  <DsfrButton
    v-if="isCreateMode"
    class="fr-btn--icon-left fr-icon-add-line"
    label="Créer une organisation"
    data-testid="admin-create-organization-btn"
    @click="openEditModal"
  />

  <div v-else class="button-row">
    <DsfrButton
      label="Modifier"
      title="Modifier l'organisation"
      aria-label="Modifier l'organisation"
      size="sm"
      secondary
      data-testid="admin-organization-edit-btn"
      @click="openEditModal"
    />
    <DsfrButton
      label="Supprimer"
      title="Supprimer l'organisation"
      aria-label="Supprimer l'organisation"
      size="sm"
      secondary
      data-testid="admin-organization-delete-btn"
      @click="openDeleteModal"
    />
  </div>

  <DsfrModal
    :opened="isEditModalOpen"
    :title="isCreateMode ? 'Créer une organisation' : 'Modifier une organisation'"
    :data-testid="isCreateMode ? 'admin-create-organization-modal' : 'admin-edit-organization-modal'"
    @close="closeEditModal"
  >
    <DsfrInputGroup
      v-model="form.path"
      class="fr-mb-2w"
      label="Chemin"
      hint="Exemple: MI/DNUM"
      label-visible
      required
      :error-message="errorMessage"
      data-testid="organization-path"
    />

    <DsfrInputGroup v-model="form.sigle" class="fr-mb-2w" label="Sigle" hint="Optionnel" label-visible data-testid="organization-sigle" />

    <DsfrInputGroup v-model="form.url" class="fr-mb-2w" label="URL" hint="Optionnel" label-visible data-testid="organization-url" />

    <div v-if="!isCreateMode" class="fr-mt-3w">
      <h5 class="fr-h6 fr-mb-2w">Références MAIA</h5>

      <div class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
        <div class="fr-col-12 fr-col-md-9">
          <DsfrInputGroup
            v-model="newMaiaReference"
            label="Ajouter une référence MAIA"
            label-visible
            hint="Exemple: MI/DNUM/SDID"
            :error-message="referencesErrorMessage"
            data-testid="organization-maia-reference-input"
          />
        </div>
        <div class="fr-col-12 fr-col-md-3 add-reference-btn-col">
          <DsfrButton
            label="Ajouter"
            title="Ajouter la référence MAIA"
            aria-label="Ajouter la référence MAIA"
            size="sm"
            :disabled="isAddingReference || !newMaiaReference.trim()"
            data-testid="organization-maia-reference-add-btn"
            @click="addMaiaReference"
          />
        </div>
      </div>

      <div v-if="!maiaReferences.length" class="fr-text--sm">Aucune référence MAIA.</div>
      <ul v-else class="reference-list">
        <li v-for="reference in maiaReferences" :key="reference.id" class="reference-item">
          <span class="fr-badge fr-badge--sm fr-badge--blue-ecume">{{ reference.maiaRef }}</span>
          <DsfrButton
            label="Supprimer"
            title="Supprimer la référence MAIA"
            aria-label="Supprimer la référence MAIA"
            size="sm"
            secondary
            data-testid="organization-maia-reference-delete-btn"
            @click="deleteMaiaReference(reference.id)"
          />
        </li>
      </ul>
    </div>

    <template #footer>
      <DsfrButton
        label="Annuler"
        title="Annuler la modification"
        aria-label="Annuler la modification"
        secondary
        data-testid="admin-cancel-btn"
        @click="closeEditModal"
      />
      <DsfrButton
        label="Enregistrer"
        title="Enregistrer l'organisation"
        aria-label="Enregistrer l'organisation"
        :disabled="isSaving"
        data-testid="admin-save-organization-btn"
        @click="saveOrganization"
      />
    </template>
  </DsfrModal>

  <DsfrModal
    :opened="isDeleteModalOpen"
    title="Supprimer l'organisation"
    data-testid="admin-delete-organization-modal"
    @close="closeDeleteModal"
  >
    <DsfrAlert
      id="organization-delete-alert"
      title="Cette action est irréversible"
      :description="`Êtes-vous sûr de vouloir supprimer l'organisation : ${organization?.path} ?`"
      type="warning"
      class="fr-mb-3w alert-multiline"
      data-testid="organization-delete-alert"
    />

    <template #footer>
      <DsfrButton
        label="Annuler"
        title="Annuler la suppression"
        aria-label="Annuler la suppression"
        secondary
        data-testid="admin-delete-cancel-btn"
        @click="closeDeleteModal"
      />
      <DsfrButton
        label="Supprimer"
        title="Confirmer la suppression"
        aria-label="Confirmer la suppression"
        danger
        :disabled="isDeleting"
        data-testid="admin-delete-confirm-btn"
        @click="deleteOrganization"
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

.add-reference-btn-col {
  display: flex;
  align-items: flex-end;
}

.reference-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.reference-item {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}
</style>
