<script setup lang="ts">
import { ref } from "vue";
import type { QualityCampaignDto } from "@/client/types.gen";
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
const isSending = ref(false);
const isSendingReport = ref(false);
const errorMessage = ref<string>("");

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

  isSaving.value = true;
  errorMessage.value = "";

  // Une fois la campagne envoyée, le backend rejette toute modification de la date de début
  // (cf. quality-campaign.service.ts#update) : on l'omet du payload plutôt que de renvoyer sa
  // valeur inchangée, qui déclencherait quand même le refus.
  const updated = await store.updateCampaign(props.campaign.id, {
    name: editingName.value.trim(),
    sponsorEmails: editingSponsorEmails.value.map((email) => email.trim()).filter(Boolean),
    // #2387 : `null` (et non `undefined`) pour vider effectivement le champ côté back.
    message: editingMessage.value.trim() || null,
    startDate: props.campaign.status === "sent" ? undefined : new Date(editingStartDate.value),
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

async function sendCampaign() {
  isSending.value = true;
  const sent = await store.sendCampaign(props.campaign.id);
  if (sent) {
    emit("fetchCampaigns");
  }
  isSending.value = false;
}

async function sendSponsorReport() {
  isSendingReport.value = true;
  await store.sendSponsorReport(props.campaign.id);
  isSendingReport.value = false;
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
      v-if="campaign.status === 'scheduled'"
      :label="isSending ? 'Envoi…' : 'Envoyer maintenant'"
      size="sm"
      secondary
      :disabled="isSending"
      data-testid="admin-quality-campaign-send-btn"
      title="Déclencher immédiatement l'envoi de la campagne aux acteurs"
      aria-label="Envoyer maintenant la campagne aux acteurs"
      @click="sendCampaign"
    />
    <DsfrButton
      v-if="campaign.status === 'sent' && campaign.sponsorEmails.length > 0"
      :label="isSendingReport ? 'Envoi…' : 'Envoyer le rapport au sponsor'"
      size="sm"
      secondary
      :disabled="isSendingReport"
      data-testid="admin-quality-campaign-send-report-btn"
      title="Envoyer au sponsor un email récapitulatif de l'impact actuel"
      aria-label="Envoyer le rapport de résultats au sponsor"
      @click="sendSponsorReport"
    />
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
    <p v-if="campaign.status === 'sent'" class="fr-text--sm fr-hint-text fr-mb-3w" style="white-space: normal">
      Cette campagne a déjà été envoyée : le filtre et la date de début ne peuvent plus être modifiés.
    </p>

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
    <SponsorEmailsInput v-model="editingSponsorEmails" testid-prefix="quality-campaign-sponsor-email" />

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
      hint="Déclenche l'envoi automatique aux acteurs"
      label-visible
      required
      :disabled="campaign.status === 'sent'"
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
  gap: 0.5rem;
  flex-wrap: wrap;
}
.alert-multiline {
  white-space: normal;
  word-wrap: break-word;
}
</style>
