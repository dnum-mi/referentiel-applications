<script setup lang="ts">
import { ref } from "vue";
import { useReportIssueStore } from "@/stores/reportIssueStore";
import { useToasterStore } from "@/stores/toasterStore";

const props = withDefaults(
  defineProps<{
    opened?: boolean
  }>(),
  {
    opened: false,
  },
);

const emit = defineEmits<{
  (e: "close"): void
}>();

const toaster = useToasterStore();
const reportIssueStore = useReportIssueStore();

const anomalyReport = ref<{ description: string }>({ description: "" });

async function submitAnomaly() {
  try {
    await reportIssueStore.proposeAnomaly("", anomalyReport.value.description);

    toaster.addSuccessMessage("Merci pour votre signalement !");
    closeModal();
  } catch (error) {
    toaster.addErrorMessage("Une erreur est survenue lors de l'envoi du signalement");
    throw error;
  }
  closeModal();
}

function resetForm() {
  anomalyReport.value.description = "";
}

function closeModal() {
  resetForm();
  emit("close");
}
</script>

<template>
  <DsfrModal :opened="props.opened" title="Signaler une anomalie" data-testid="report-anomaly-modal" @close="closeModal">
    <DsfrInput
      v-model="anomalyReport.description"
      is-textarea
      placeholder="Décrivez l'anomalie rencontrée..."
      required
      rows="2"
      data-testid="report-anomaly-description"
    />

    <DsfrButton data-testid="report-anomaly-submit-btn" class="fr-mt-2w" @click="submitAnomaly">
      Envoyer
    </DsfrButton>
  </DsfrModal>
</template>
