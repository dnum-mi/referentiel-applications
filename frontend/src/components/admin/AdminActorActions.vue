<script setup lang="ts">
import api from "@/api";
import type { ActorDto, ActorTypeDto, CreateActorDto, OrganizationDto, UpdateActorDto } from "@/client/types.gen";
import ActorForm from "@/components/actor/ActorForm.vue";
import OrganizationSearchSelect from "@/components/common/OrganizationSearchSelect.vue";
import type { Application } from "@/models/Application";
import { useOrganizationStore } from "@/stores/organizationStore";
import { useToasterStore } from "@/stores/toasterStore";
import { computed, ref } from "vue";

const props = defineProps<{
  actor: ActorDto;
  actorTypes: ActorTypeDto[];
}>();

const emit = defineEmits<{
  updated: [];
}>();

const toaster = useToasterStore();
const organizationStore = useOrganizationStore();

const actorTypeOptions = computed(() =>
  props.actorTypes.map((type) => ({ text: type.label, value: type.id })).sort((a, b) => b.text.localeCompare(a.text, "fr")),
);

const availableApplications = ref<Array<{ id: string; label: string }>>([]);
const isLoadingApplications = ref(false);

async function fetchApplicationsForEmail() {
  if (!props.actor.email) return;
  isLoadingApplications.value = true;
  try {
    const response = await api.actorControllerFindApplicationsByEmail({
      query: { email: props.actor.email },
    });
    if (response.response.ok && response.data) {
      availableApplications.value = response.data as Array<{ id: string; label: string }>;
    }
  } catch {
    availableApplications.value = [];
  } finally {
    isLoadingApplications.value = false;
  }
}

const applicationMultiselectOptions = computed(() =>
  availableApplications.value.map((app) => ({
    id: app.id,
    label: app.label,
  })),
);

const isEditModalOpen = ref(false);
const isSaving = ref(false);

const editInitialData = computed<CreateActorDto>(() => ({
  email: props.actor.email || "",
  firstname: props.actor.firstname || "",
  lastname: props.actor.lastname || "",
  actorTypeId: props.actor.actorTypeId,
  organizationId: props.actor.organizationId,
  isGroup: props.actor.isGroup,
}));

const editApplication = computed(() => ({ id: props.actor.applicationId }) as Application);

function openEditModal() {
  isEditModalOpen.value = true;
}

function closeEditModal() {
  isEditModalOpen.value = false;
}

async function saveActor(formData: CreateActorDto) {
  isSaving.value = true;
  try {
    const response = await api.actorControllerUpdateActor({
      path: { id: props.actor.id },
      body: formData as UpdateActorDto,
    });
    if (response.response.ok) {
      toaster.addSuccessMessage("Acteur mis à jour avec succès");
      closeEditModal();
      emit("updated");
    } else {
      toaster.addErrorMessage("Erreur lors de la mise à jour de l'acteur");
    }
  } catch {
    toaster.addErrorMessage("Erreur lors de la mise à jour de l'acteur");
  } finally {
    isSaving.value = false;
  }
}

const isEditAllModalOpen = ref(false);
const isSavingAll = ref(false);
const editAllForm = ref<UpdateActorDto>({});
const selectedEditAppIds = ref<string[]>([]);
const editAllOrganizationId = computed({
  get: () => editAllForm.value.organizationId || "",
  set: (value: string) => {
    editAllForm.value.organizationId = value === "" ? null : value;
  },
});
const isEditAllGroup = computed(() => !!editAllForm.value.isGroup);
const replaceActorType = ref(false);
const replaceOrganization = ref(false);
const isSyncingFromMaia = ref(false);
const editAllInitialOrganization = ref<OrganizationDto | null>(null);

async function syncEditAllFromMaia() {
  const email = editAllForm.value.email?.trim();
  if (!email) {
    toaster.addErrorMessage("L'email est requis pour synchroniser depuis MAIA");
    return;
  }
  isSyncingFromMaia.value = true;
  try {
    const response = await api.userControllerSyncOrganizationFromMaiaByEmail({ path: { email } });
    if (response.response.ok && response.data) {
      const { organizationId: newOrgId, firstName, lastName } = response.data;
      editAllForm.value.firstname = firstName;
      editAllForm.value.lastname = lastName;
      if (replaceOrganization.value && newOrgId) {
        const org = await organizationStore.getById(newOrgId);
        if (org) {
          editAllInitialOrganization.value = org;
        }
        editAllForm.value.organizationId = newOrgId;
      }
      toaster.addSuccessMessage("Synchronisation depuis MAIA effectuée");
    } else {
      toaster.addErrorMessage("Erreur lors de la synchronisation MAIA (email non trouvé)");
    }
  } catch {
    toaster.addErrorMessage("Erreur lors de la synchronisation MAIA");
  } finally {
    isSyncingFromMaia.value = false;
  }
}

async function openEditAllModal() {
  editAllForm.value = {
    email: props.actor.email || "",
    firstname: props.actor.firstname || "",
    lastname: props.actor.lastname || "",
    actorTypeId: props.actor.actorTypeId,
    organizationId: props.actor.organizationId,
    isGroup: props.actor.isGroup,
  };
  replaceActorType.value = false;
  replaceOrganization.value = false;
  editAllInitialOrganization.value = null;
  await fetchApplicationsForEmail();
  selectedEditAppIds.value = availableApplications.value.map((a) => a.id);
  isEditAllModalOpen.value = true;
}

function closeEditAllModal() {
  isEditAllModalOpen.value = false;
}

async function saveAllByEmail() {
  if (!props.actor.email) return;
  isSavingAll.value = true;
  try {
    const { actorTypeId, organizationId, ...restForm } = editAllForm.value;
    const updateData: UpdateActorDto = {
      ...restForm,
      email: restForm.email?.trim() || "",
      firstname: !isEditAllGroup.value ? (restForm.firstname?.trim() ?? undefined) : undefined,
      lastname: !isEditAllGroup.value ? (restForm.lastname?.trim() ?? undefined) : undefined,
      ...(replaceActorType.value ? { actorTypeId } : {}),
      ...(replaceOrganization.value ? { organizationId } : {}),
    };
    const allSelected = selectedEditAppIds.value.length === availableApplications.value.length;
    const response = await api.actorControllerUpdateAllByEmail({
      body: {
        ...updateData,
        targetEmail: props.actor.email,
        ...(!allSelected && selectedEditAppIds.value.length > 0 ? { applicationIds: selectedEditAppIds.value } : {}),
      },
    });
    if (response.response.ok) {
      const count = (response.data as any)?.count ?? 0;
      toaster.addSuccessMessage(`${count} acteur(s) mis à jour avec succès`);
      closeEditAllModal();
      emit("updated");
    } else {
      toaster.addErrorMessage("Erreur lors de la mise à jour des acteurs");
    }
  } catch {
    toaster.addErrorMessage("Erreur lors de la mise à jour des acteurs");
  } finally {
    isSavingAll.value = false;
  }
}

const isDeleteModalOpen = ref(false);
const isDeleting = ref(false);

function openDeleteModal() {
  isDeleteModalOpen.value = true;
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
}

async function confirmDelete() {
  isDeleting.value = true;
  try {
    const response = await api.actorControllerDeleteActor({
      path: { id: props.actor.id },
    });
    if (response.response.ok) {
      toaster.addSuccessMessage("Acteur supprimé avec succès");
      closeDeleteModal();
      emit("updated");
    } else {
      toaster.addErrorMessage("Erreur lors de la suppression de l'acteur");
    }
  } catch {
    toaster.addErrorMessage("Erreur lors de la suppression de l'acteur");
  } finally {
    isDeleting.value = false;
  }
}

const isDeleteAllModalOpen = ref(false);
const isDeletingAll = ref(false);
const selectedDeleteAppIds = ref<string[]>([]);

async function openDeleteAllModal() {
  await fetchApplicationsForEmail();
  selectedDeleteAppIds.value = availableApplications.value.map((a) => a.id);
  isDeleteAllModalOpen.value = true;
}

function closeDeleteAllModal() {
  isDeleteAllModalOpen.value = false;
}

async function confirmDeleteAll() {
  if (!props.actor.email) return;
  isDeletingAll.value = true;
  try {
    const allSelected = selectedDeleteAppIds.value.length === availableApplications.value.length;
    const response = await api.actorControllerDeleteAllByEmail({
      body: {
        email: props.actor.email,
        ...(!allSelected && selectedDeleteAppIds.value.length > 0 ? { applicationIds: selectedDeleteAppIds.value } : {}),
      },
    });
    if (response.response.ok) {
      const count = (response.data as any)?.count ?? 0;
      toaster.addSuccessMessage(`${count} acteur(s) supprimé(s) avec succès`);
      closeDeleteAllModal();
      emit("updated");
    } else {
      toaster.addErrorMessage("Erreur lors de la suppression des acteurs");
    }
  } catch {
    toaster.addErrorMessage("Erreur lors de la suppression des acteurs");
  } finally {
    isDeletingAll.value = false;
  }
}

const actorDisplayName = computed(() => {
  const parts = [props.actor.firstname, props.actor.lastname].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : props.actor.email || props.actor.id;
});
</script>

<template>
  <div class="actions-row">
    <DsfrButton
      label="Modifier"
      title="Modifier cet acteur"
      size="sm"
      secondary
      data-testid="admin-actor-edit-btn"
      @click="openEditModal"
    />
    <DsfrButton
      label="Supprimer"
      title="Supprimer cet acteur"
      size="sm"
      secondary
      data-testid="admin-actor-delete-btn"
      @click="openDeleteModal"
    />
    <DsfrButton
      v-if="actor.email"
      label="Modifier tous"
      title="Modifier tous les acteurs avec cet email"
      size="sm"
      tertiary
      data-testid="admin-actor-edit-all-btn"
      @click="openEditAllModal"
    />
    <DsfrButton
      v-if="actor.email"
      label="Supprimer tous"
      title="Supprimer tous les acteurs avec cet email"
      size="sm"
      tertiary
      data-testid="admin-actor-delete-all-btn"
      @click="openDeleteAllModal"
    />
  </div>

  <DsfrModal :opened="isEditModalOpen" title="Modifier cet acteur" data-testid="admin-edit-actor-modal" @close="closeEditModal">
    <ActorForm
      :initial-data="editInitialData"
      :is-submitting="isSaving"
      :application="editApplication"
      :actor-types="actorTypes"
      @submit="saveActor"
      @cancel="closeEditModal"
    />
  </DsfrModal>

  <DsfrModal
    :opened="isEditAllModalOpen"
    title="Modifier les acteurs par email"
    data-testid="admin-edit-all-actor-modal"
    @close="closeEditAllModal"
  >
    <DsfrAlert
      :description="`Les acteurs avec l'email « ${actor.email} » dans les applications sélectionnées seront modifiés.`"
      type="info"
      class="fr-mb-3w alert-wrap"
    />

    <DsfrMultiselect
      v-model="selectedEditAppIds"
      label="Applications concernées"
      :options="applicationMultiselectOptions"
      :select-all="true"
      button-label="Sélectionner les applications"
      :disabled="isLoadingApplications"
      data-testid="admin-actor-edit-all-apps"
      class="fr-mb-3w"
    />

    <hr class="separator" />

    <DsfrCheckbox
      v-model="replaceActorType"
      name="replaceActorType"
      :value="true"
      label="Remplacer le type d'acteur"
      data-testid="admin-actor-all-replace-type-checkbox"
      class="fr-mb-1w checkbox-align"
    />
    <DsfrSelect
      v-if="replaceActorType"
      v-model="editAllForm.actorTypeId"
      label="Type d'acteur"
      required
      :options="actorTypeOptions"
      data-testid="admin-actor-all-type-select"
      class="fr-mb-3w"
    />

    <hr class="separator" />

    <DsfrInput
      v-model="editAllForm.email"
      label="Nouvel email"
      label-visible
      type="email"
      placeholder="exemple@domaine.com"
      data-testid="admin-actor-all-email-input"
      class="fr-mb-1w"
    />
    <DsfrButton
      type="button"
      label="Synchroniser depuis MAIA (par email)"
      size="sm"
      tertiary
      :disabled="isSyncingFromMaia || !editAllForm.email"
      data-testid="admin-actor-all-sync-maia-btn"
      class="fr-mb-3w"
      @click="syncEditAllFromMaia"
    />

    <hr class="separator" />

    <DsfrCheckbox
      v-model="replaceOrganization"
      name="replaceOrganization"
      :value="true"
      label="Remplacer l'organisation"
      data-testid="admin-actor-all-replace-org-checkbox"
      class="fr-mb-1w checkbox-align"
    />
    <OrganizationSearchSelect
      v-if="replaceOrganization"
      v-model="editAllOrganizationId"
      :initial-organization="editAllInitialOrganization"
      data-testid="admin-actor-all-organization"
      class="fr-mb-3w"
    />

    <hr class="separator" />

    <DsfrCheckbox
      v-model="editAllForm.isGroup"
      name="isGroupAll"
      :value="true"
      label="Cet acteur est un groupe"
      data-testid="admin-actor-all-is-group-checkbox"
      class="fr-mb-3w checkbox-align"
    />
    <template v-if="!isEditAllGroup">
      <DsfrInput
        v-model="editAllForm.firstname"
        label="Prénom"
        label-visible
        placeholder="Prénom"
        data-testid="admin-actor-all-firstname-input"
        class="fr-mb-3w"
      />
      <DsfrInput
        v-model="editAllForm.lastname"
        label="Nom"
        label-visible
        placeholder="Nom de famille"
        data-testid="admin-actor-all-lastname-input"
        class="fr-mb-3w"
      />
    </template>
    <template #footer>
      <DsfrButton label="Annuler" secondary @click="closeEditAllModal" />
      <DsfrButton
        label="Modifier"
        :disabled="isSavingAll || selectedEditAppIds.length === 0"
        data-testid="admin-actor-save-all-btn"
        @click="saveAllByEmail"
      />
    </template>
  </DsfrModal>

  <DsfrModal :opened="isDeleteModalOpen" title="Supprimer cet acteur" data-testid="admin-delete-actor-modal" @close="closeDeleteModal">
    <DsfrAlert
      title="Cette action est irréversible"
      :description="`Êtes-vous sûr de vouloir supprimer l'acteur : ${actorDisplayName} ?`"
      type="warning"
      class="fr-mb-3w alert-wrap"
    />
    <template #footer>
      <DsfrButton label="Annuler" secondary @click="closeDeleteModal" />
      <DsfrButton label="Supprimer" danger :disabled="isDeleting" data-testid="admin-actor-delete-confirm-btn" @click="confirmDelete" />
    </template>
  </DsfrModal>

  <DsfrModal
    :opened="isDeleteAllModalOpen"
    title="Supprimer les acteurs par email"
    data-testid="admin-delete-all-actor-modal"
    @close="closeDeleteAllModal"
  >
    <DsfrAlert
      title="Cette action est irréversible"
      :description="`Les acteurs avec l'email « ${actor.email} » seront supprimés des applications sélectionnées.`"
      type="warning"
      class="fr-mb-3w alert-wrap"
    />

    <DsfrMultiselect
      v-model="selectedDeleteAppIds"
      label="Applications concernées"
      :options="applicationMultiselectOptions"
      :select-all="true"
      button-label="Sélectionner les applications"
      :disabled="isLoadingApplications"
      data-testid="admin-actor-delete-all-apps"
      class="fr-mb-3w"
    />

    <template #footer>
      <DsfrButton label="Annuler" secondary @click="closeDeleteAllModal" />
      <DsfrButton
        label="Supprimer"
        danger
        :disabled="isDeletingAll || selectedDeleteAppIds.length === 0"
        data-testid="admin-actor-delete-all-confirm-btn"
        @click="confirmDeleteAll"
      />
    </template>
  </DsfrModal>
</template>

<style scoped>
.actions-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.alert-wrap {
  text-wrap: auto;
}

.separator {
  border: none;
  border-top: 1px solid var(--border-default-grey);
  margin: 1.5rem 0;
}

.checkbox-align :deep(.fr-fieldset) {
  margin-left: 0;
  padding-left: 0;
}

:deep(.fr-multiselect) {
  position: relative;
  z-index: 1;
}

:deep(.fr-multiselect__collapse) {
  position: relative;
  z-index: 1;
}
</style>
