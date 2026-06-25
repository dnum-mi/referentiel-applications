<script setup lang="ts">
import { ref } from "vue";
import type { MditCampaignDto } from "@/client/types.gen";
import { useToasterStore } from "@/stores/toasterStore";
import api from "@/api";

const props = defineProps<{
  campaign?: MditCampaignDto;
}>();

const emit = defineEmits<{
  fetchCampaigns: [];
}>();

const toaster = useToasterStore();

const isEditModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const editingYear = ref<number | undefined>(undefined);
const editingLabel = ref<string>("");
const editingActive = ref<boolean>(true);
const errorMessage = ref<string>("");

function openEditModal() {
  editingYear.value = props.campaign?.year;
  editingLabel.value = props.campaign?.label || "";
  editingActive.value = props.campaign?.isActive ?? true;
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

async function saveCampaign() {
  const year = Number(editingYear.value);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    errorMessage.value = "Le millésime doit être une année entre 2000 et 2100.";
    return;
  }

  isSaving.value = true;
  errorMessage.value = "";

  const body = {
    year,
    label: editingLabel.value || undefined,
    isActive: editingActive.value,
  };

  const response = props.campaign?.id
    ? await api.mditCampaignControllerUpdate({ path: { id: props.campaign.id }, body })
    : await api.mditCampaignControllerCreate({ body });

  if (response.response.ok) {
    toaster.addSuccessMessage(props.campaign?.id ? "Campagne mise à jour avec succès" : "Campagne créée avec succès");
    closeEditModal();
    emit("fetchCampaigns");
  } else if (response.response.status === 409) {
    errorMessage.value = "Une campagne existe déjà pour ce millésime.";
  } else if (response.response.status === 400) {
    errorMessage.value = "Les informations saisies sont incorrectes.";
  } else {
    errorMessage.value = "Erreur lors de la sauvegarde de la campagne.";
  }
  isSaving.value = false;
}

async function deleteCampaign() {
  if (!props.campaign?.id) return;

  isDeleting.value = true;

  const response = await api.mditCampaignControllerRemove({ path: { id: props.campaign.id } });
  if (response.response.ok) {
    toaster.addSuccessMessage("Campagne supprimée avec succès");
    closeDeleteModal();
    emit("fetchCampaigns");
  } else {
    toaster.addErrorMessage("Erreur lors de la suppression de la campagne");
  }
  isDeleting.value = false;
}
</script>

<template>
  <DsfrButton
    v-if="!campaign?.id"
    class="fr-btn--icon-left fr-icon-add-line"
    label="Créer une campagne"
    data-testid="admin-create-campaign-btn"
    title="Créer une nouvelle campagne"
    aria-label="Créer une nouvelle campagne"
    @click="openEditModal"
  />

  <div v-else class="button-row">
    <DsfrButton
      label="Modifier"
      size="sm"
      secondary
      data-testid="admin-campaign-edit-btn"
      title="Modifier la campagne"
      aria-label="Modifier la campagne"
      @click="openEditModal"
    />
    <DsfrButton
      label="Supprimer"
      size="sm"
      secondary
      data-testid="admin-campaign-delete-btn"
      title="Supprimer la campagne"
      aria-label="Supprimer la campagne"
      @click="openDeleteModal"
    />
  </div>

  <DsfrModal
    :opened="isEditModalOpen"
    :title="!campaign?.id ? 'Créer une campagne dette IT' : `Modifier la campagne ${campaign?.year}`"
    :data-testid="!campaign?.id ? 'admin-create-campaign-modal' : 'admin-edit-campaign-modal'"
    @close="closeEditModal"
  >
    <p class="fr-text--sm fr-hint-text fr-mb-3w" style="white-space: normal">
      Une campagne correspond à un millésime (année) de collecte de la dette IT. La campagne active la plus récente est présentée par défaut
      dans le diagramme Time.
    </p>

    <DsfrAlert v-if="errorMessage" type="error" :description="errorMessage" small class="fr-mb-3w" data-testid="campaign-form-error" />

    <DsfrInputGroup
      v-model.number="editingYear"
      class="fr-mb-3w"
      type="number"
      label="Millésime (année)"
      hint="Année sur 4 chiffres, entre 2000 et 2100 (ex. 2027)"
      label-visible
      required
      :min="2000"
      :max="2100"
      data-testid="campaign-year"
    />

    <DsfrInputGroup
      v-model="editingLabel"
      class="fr-mb-3w"
      label="Libellé (optionnel)"
      hint="Texte affiché dans le sélecteur de campagne ; à défaut, l'année est utilisée"
      label-visible
      data-testid="campaign-label"
    />

    <DsfrToggleSwitch
      :model-value="editingActive"
      label="Campagne active"
      hint="Seules les campagnes actives apparaissent dans le sélecteur du diagramme Time"
      data-testid="campaign-active"
      @update:model-value="editingActive = $event"
    />

    <template #footer>
      <DsfrButtonGroup :inline-layout-when="true" :reverse="true">
        <DsfrButton
          label="Annuler"
          secondary
          data-testid="admin-campaign-cancel-btn"
          title="Annuler"
          aria-label="Annuler"
          @click="closeEditModal"
        />
        <DsfrButton
          :label="isSaving ? 'Enregistrement…' : 'Enregistrer'"
          title="Enregistrer"
          aria-label="Enregistrer"
          :disabled="isSaving"
          data-testid="admin-campaign-save-btn"
          @click="saveCampaign"
        />
      </DsfrButtonGroup>
    </template>
  </DsfrModal>

  <DsfrModal :opened="isDeleteModalOpen" title="Supprimer la campagne" data-testid="admin-delete-campaign-modal" @close="closeDeleteModal">
    <DsfrAlert
      id="campaign-delete-alert"
      title="Cette action est irréversible"
      :description="`Êtes-vous sûr de vouloir supprimer la campagne : ${campaign?.year} ?`"
      type="warning"
      class="fr-mb-3w alert-multiline"
      data-testid="campaign-delete-alert"
    />

    <template #footer>
      <DsfrButtonGroup :inline-layout-when="true" :reverse="true">
        <DsfrButton
          label="Annuler"
          secondary
          data-testid="admin-campaign-delete-cancel-btn"
          title="Annuler la suppression"
          aria-label="Annuler la suppression"
          @click="closeDeleteModal"
        />
        <DsfrButton
          label="Supprimer"
          data-testid="admin-campaign-delete-confirm-btn"
          title="Confirmer la suppression"
          aria-label="Confirmer la suppression"
          danger
          :disabled="isDeleting"
          @click="deleteCampaign"
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
