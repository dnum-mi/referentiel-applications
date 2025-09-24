<script setup lang="ts">
import { ref, computed } from "vue";
import { useReportIssueStore } from "@/stores/reportIssueStore";
import { useToasterStore } from "@/stores/toasterStore";

const props = withDefaults(
  defineProps<{
    opened?: boolean
    context?: "global" | "application"
    applicationId?: string
  }>(),
  {
    opened: false,
    context: "global",
  },
);

const emit = defineEmits<{
  (e: "close"): void
}>();

const toaster = useToasterStore();
const reportIssueStore = useReportIssueStore();

const description = ref("");
const isSubmitting = ref(false);

const title = computed(() =>
  props.context === "application"
    ? "Demander une correction sur cette application"
    : "Signaler une application manquante",
);

const placeholderText = computed(() =>
  props.context === "application"
    ? "Décrivez la correction souhaitée (champ à jour, erreur constatée, etc.)…"
    : "Décrivez l’application manquante (nom, URL, entité responsable, contexte)…",
);

async function submitAnomaly() {
  const desc = description.value.trim();
  if (!desc) {
    toaster.addErrorMessage("Veuillez décrire votre signalement.");
    return;
  }

  isSubmitting.value = true;
  try {
    if (props.context === "application") {
      if (!props.applicationId) throw new Error("applicationId manquant pour une correction d'application");
      await reportIssueStore.proposeCorrection(props.applicationId, desc);
    } else {
      await reportIssueStore.proposeAnomaly(desc);
    }

    toaster.addSuccessMessage("Merci pour votre signalement !");
    closeModal();
  } catch (error) {
    toaster.addErrorMessage("Une erreur est survenue lors de l'envoi du signalement");
    console.error("❌ submitAnomaly:", error);
  } finally {
    isSubmitting.value = false;
  }
}

function resetForm() {
  description.value = "";
}

function closeModal() {
  resetForm();
  emit("close");
}
</script>

<template>
  <DsfrModal
    :opened="props.opened"
    :title="title"
    data-testid="report-anomaly-modal"
    @close="closeModal"
  >
    <DsfrInput
      v-model="description"
      is-textarea
      :placeholder="placeholderText"
      required
      rows="4"
      data-testid="report-anomaly-description"
    />

    <DsfrButton
      data-testid="report-anomaly-submit-btn"
      class="fr-mt-2w"
      :disabled="isSubmitting"
      :aria-busy="isSubmitting"
      @click="submitAnomaly"
    >
      {{ isSubmitting ? "Envoi…" : "Envoyer" }}
    </DsfrButton>
  </DsfrModal>
</template>
