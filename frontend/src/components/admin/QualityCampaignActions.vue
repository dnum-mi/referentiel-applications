<script setup lang="ts">
import { ref } from "vue";
import type { QualityCampaignDto, UpdateQualityCampaignStatusDto } from "@/client/types.gen";
import { useQualityCampaignStore } from "@/stores/qualityCampaignStore";
import SponsorEmailsInput from "@/components/form/SponsorEmailsInput.vue";

const props = defineProps<{
  campaign: QualityCampaignDto;
}>();

const emit = defineEmits<{
  fetchCampaigns: [];
}>();

const store = useQualityCampaignStore();

const isEditModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const isSendingReport = ref(false);
const isChangingStatus = ref(false);
const errorMessage = ref<string>("");
const areSponsorEmailsValid = ref(true);

const statusOptions = [
  { text: "Planifiée", value: "scheduled" },
  { text: "En cours", value: "in_progress" },
  { text: "Terminée", value: "done" },
];

const editingName = ref("");
const editingSponsorEmails = ref<string[]>([]);
const editingMessage = ref("");
const editingStartDate = ref("");
const editingEndDate = ref("");

function toDateInputValue(value?: Date | string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function openEditModal() {
  editingName.value = props.campaign.name;
  editingSponsorEmails.value = [...props.campaign.sponsorEmails];
  editingMessage.value = props.campaign.message ?? "";
  editingStartDate.value = toDateInputValue(props.campaign.startDate);
  editingEndDate.value = toDateInputValue(props.campaign.endDate);
  errorMessage.value = "";
  areSponsorEmailsValid.value = true;
  isEditModalOpen.value = true;
}

function closeEditModal() {
  isEditModalOpen.value = false;
  errorMessage.value = "";
}

function openDeleteModal() {
  isDeleteModalOpen.value = true;
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
}

async function saveCampaign() {
  if (!editingName.value.trim()) {
    errorMessage.value = "Le nom de la campagne est requis.";
    return;
  }
  if (!editingStartDate.value) {
    errorMessage.value = "La date de début est requise.";
    return;
  }
  if (!areSponsorEmailsValid.value) {
    errorMessage.value = "Un ou plusieurs emails sponsors sont invalides.";
    return;
  }

  isSaving.value = true;
  errorMessage.value = "";

  const updated = await store.updateCampaign(props.campaign.id, {
    name: editingName.value.trim(),
    sponsorEmails: editingSponsorEmails.value.map((email) => email.trim()).filter(Boolean),
    message: editingMessage.value.trim() || null,
    startDate: new Date(editingStartDate.value),
    endDate: editingEndDate.value ? new Date(editingEndDate.value) : null,
  });

  if (updated) {
    closeEditModal();
    emit("fetchCampaigns");
  } else {
    errorMessage.value = "Erreur lors de la sauvegarde de la campagne.";
  }
  isSaving.value = false;
}

async function deleteCampaign() {
  isDeleting.value = true;
  await store.deleteCampaign(props.campaign.id);
  closeDeleteModal();
  emit("fetchCampaigns");
  isDeleting.value = false;
}

async function sendSponsorReport() {
  isSendingReport.value = true;
  await store.sendSponsorReport(props.campaign.id);
  isSendingReport.value = false;
}

async function changeStatus(status: UpdateQualityCampaignStatusDto["status"]) {
  if (status === props.campaign.status) return;
  isChangingStatus.value = true;
  const updated = await store.updateCampaignStatus(props.campaign.id, status);
  if (updated) {
    emit("fetchCampaigns");
  }
  isChangingStatus.value = false;
}
</script>

<template>
  <div class="button-row">
    <DsfrButton
      label="Modifier"
      size="sm"
      secondary
      data-testid="admin-quality-campaign-edit-btn"
      title="Modifier la campagne"
      aria-label="Modifier la campagne"
      @click="openEditModal"
    />
    <DsfrButton
      v-if="campaign.sponsorEmails.length > 0"
      :label="isSendingReport ? 'Envoi…' : 'Envoyer le rapport au sponsor'"
      size="sm"
      secondary
      :disabled="isSendingReport"
      data-testid="admin-quality-campaign-send-report-btn"
      title="Envoyer au sponsor un email récapitulatif de l'impact actuel"
      aria-label="Envoyer le rapport de résultats au sponsor"
      @click="sendSponsorReport"
    />
    <div class="status-select-wrapper">
      <DsfrSelect
        :model-value="campaign.status"
        label="Statut"
        :options="statusOptions"
        :disabled="isChangingStatus"
        data-testid="admin-quality-campaign-status-select"
        title="Changer librement le statut de la campagne"
        aria-label="Changer le statut de la campagne"
        @update:model-value="(value) => changeStatus(value as UpdateQualityCampaignStatusDto['status'])"
      />
    </div>
    <DsfrButton
      label="Supprimer"
      size="sm"
      secondary
      data-testid="admin-quality-campaign-delete-btn"
      title="Supprimer la campagne"
      aria-label="Supprimer la campagne"
      @click="openDeleteModal"
    />
  </div>

  <DsfrModal
    :opened="isEditModalOpen"
    :title="`Modifier la campagne « ${campaign.name} »`"
    data-testid="admin-edit-quality-campaign-modal"
    @close="closeEditModal"
  >
    <DsfrAlert
      v-if="errorMessage"
      type="error"
      :description="errorMessage"
      small
      class="fr-mb-3w"
      data-testid="quality-campaign-form-error"
    />

    <DsfrInputGroup
      v-model="editingName"
      class="fr-mb-3w"
      label="Nom de la campagne"
      label-visible
      required
      data-testid="quality-campaign-name"
    />

    <p class="fr-text--sm fr-mb-1w">Sponsors (optionnel)</p>
    <p class="fr-text--sm fr-hint-text fr-mb-1w">Destinataires des rapports de résultats de la campagne</p>
    <SponsorEmailsInput
      v-model="editingSponsorEmails"
      testid-prefix="quality-campaign-sponsor-email"
      @update:valid="(valid) => (areSponsorEmailsValid = valid)"
    />

    <DsfrInputGroup
      v-model="editingMessage"
      class="fr-mb-3w"
      is-textarea
      label="Message incitatif (optionnel)"
      hint="Inclus dans l'email de relance envoyé aux acteurs"
      label-visible
      data-testid="quality-campaign-message"
    />

    <DsfrInputGroup
      v-model="editingStartDate"
      class="fr-mb-3w"
      type="date"
      label="Date de début"
      hint="Déclenche l'envoi automatique aux acteurs (tant que la campagne n'a pas déjà été envoyée)"
      label-visible
      required
      data-testid="quality-campaign-start-date"
    />

    <DsfrInputGroup
      v-model="editingEndDate"
      class="fr-mb-3w"
      type="date"
      label="Date de fin (optionnel)"
      label-visible
      data-testid="quality-campaign-end-date"
    />

    <template #footer>
      <DsfrButtonGroup :inline-layout-when="true" :reverse="true">
        <DsfrButton label="Annuler" secondary data-testid="admin-quality-campaign-cancel-btn" @click="closeEditModal" />
        <DsfrButton
          :label="isSaving ? 'Enregistrement…' : 'Enregistrer'"
          :disabled="isSaving"
          data-testid="admin-quality-campaign-save-btn"
          @click="saveCampaign"
        />
      </DsfrButtonGroup>
    </template>
  </DsfrModal>

  <DsfrModal
    :opened="isDeleteModalOpen"
    title="Supprimer la campagne"
    data-testid="admin-delete-quality-campaign-modal"
    @close="closeDeleteModal"
  >
    <DsfrAlert
      title="Cette action est irréversible"
      :description="`Êtes-vous sûr de vouloir supprimer la campagne « ${campaign.name} » ?`"
      type="warning"
      class="fr-mb-3w alert-multiline"
      data-testid="quality-campaign-delete-alert"
    />

    <template #footer>
      <DsfrButtonGroup :inline-layout-when="true" :reverse="true">
        <DsfrButton label="Annuler" secondary data-testid="admin-quality-campaign-delete-cancel-btn" @click="closeDeleteModal" />
        <DsfrButton
          label="Supprimer"
          danger
          :disabled="isDeleting"
          data-testid="admin-quality-campaign-delete-confirm-btn"
          @click="deleteCampaign"
        />
      </DsfrButtonGroup>
    </template>
  </DsfrModal>
</template>

<style scoped>
.button-row {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.status-select-wrapper {
  min-width: 10rem;
}
.status-select-wrapper :deep(.fr-select-group) {
  margin-bottom: 0 !important;
}
.alert-multiline {
  white-space: normal;
  word-wrap: break-word;
}
</style>
