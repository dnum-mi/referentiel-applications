<script setup lang="ts">
import { ref } from "vue";
import { useApplicationSearch } from "@/composables/use-application-search";
import { useQualityCampaignStore } from "@/stores/qualityCampaignStore";
import SponsorEmailsInput from "@/components/form/SponsorEmailsInput.vue";

defineProps<{
  opened: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { filters, total } = useApplicationSearch();
const store = useQualityCampaignStore();

const name = ref("");
const sponsorEmails = ref<string[]>([]);
const message = ref("");
const startDate = ref("");
const endDate = ref("");
const errorMessage = ref("");
const isSaving = ref(false);
const areSponsorEmailsValid = ref(true);

function reset() {
  name.value = "";
  sponsorEmails.value = [];
  message.value = "";
  startDate.value = "";
  endDate.value = "";
  errorMessage.value = "";
  areSponsorEmailsValid.value = true;
}

function close() {
  reset();
  emit("close");
}

async function confirmCreate() {
  if (!name.value.trim()) {
    errorMessage.value = "Le nom de la campagne est requis.";
    return;
  }
  if (!startDate.value) {
    errorMessage.value = "La date de début est requise.";
    return;
  }
  if (!areSponsorEmailsValid.value) {
    errorMessage.value = "Un ou plusieurs emails sponsors sont invalides.";
    return;
  }

  isSaving.value = true;
  errorMessage.value = "";

  const trimmedSponsorEmails = sponsorEmails.value.map((email) => email.trim()).filter(Boolean);

  const created = await store.createCampaign({
    name: name.value.trim(),
    filters: { ...filters.value },
    sponsorEmails: trimmedSponsorEmails.length > 0 ? trimmedSponsorEmails : undefined,
    message: message.value.trim() || undefined,
    startDate: new Date(startDate.value),
    endDate: endDate.value ? new Date(endDate.value) : undefined,
  });

  isSaving.value = false;

  if (created) {
    close();
  } else {
    errorMessage.value = "Erreur lors de la création de la campagne.";
  }
}
</script>

<template>
  <Teleport to="body">
    <DsfrModal
      :opened="opened"
      title="Créer une campagne qualité à partir de ces filtres"
      data-testid="create-quality-campaign-modal"
      @close="close"
    >
      <p class="fr-text--sm fr-hint-text fr-mb-3w" style="white-space: normal">
        La campagne ciblera les <strong>{{ total }}</strong> application(s) correspondant actuellement aux filtres du catalogue. Leurs
        acteurs (MOA/MOE) seront relancés par email à la date de début pour les inciter à améliorer l'indice de qualité.
      </p>

      <DsfrAlert
        v-if="errorMessage"
        type="error"
        :description="errorMessage"
        small
        class="fr-mb-3w"
        data-testid="create-quality-campaign-error"
      />

      <DsfrInputGroup
        v-model="name"
        class="fr-mb-3w"
        label="Nom de la campagne"
        label-visible
        required
        data-testid="create-quality-campaign-name"
      />

      <p class="fr-text--sm fr-mb-1w">Sponsors (optionnel)</p>
      <p class="fr-text--sm fr-hint-text fr-mb-1w">Destinataires des rapports de résultats de la campagne</p>
      <SponsorEmailsInput
        v-model="sponsorEmails"
        testid-prefix="create-quality-campaign-sponsor-email"
        @update:valid="(valid) => (areSponsorEmailsValid = valid)"
      />

      <DsfrInputGroup
        v-model="message"
        class="fr-mb-3w"
        is-textarea
        label="Message incitatif (optionnel)"
        hint="Inclus dans l'email de relance envoyé aux acteurs"
        label-visible
        data-testid="create-quality-campaign-message"
      />

      <DsfrInputGroup
        v-model="startDate"
        class="fr-mb-3w"
        type="date"
        label="Date de début"
        hint="Déclenche l'envoi automatique aux acteurs"
        label-visible
        required
        data-testid="create-quality-campaign-start-date"
      />

      <DsfrInputGroup
        v-model="endDate"
        class="fr-mb-3w"
        type="date"
        label="Date de fin (optionnel)"
        label-visible
        data-testid="create-quality-campaign-end-date"
      />

      <template #footer>
        <DsfrButtonGroup :inline-layout-when="true" :reverse="true">
          <DsfrButton label="Annuler" secondary data-testid="create-quality-campaign-cancel-btn" @click="close" />
          <DsfrButton
            :label="isSaving ? 'Création…' : 'Créer la campagne'"
            :disabled="isSaving"
            data-testid="create-quality-campaign-confirm-btn"
            @click="confirmCreate"
          />
        </DsfrButtonGroup>
      </template>
    </DsfrModal>
  </Teleport>
</template>
