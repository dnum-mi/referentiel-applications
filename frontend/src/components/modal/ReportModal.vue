<script setup lang="ts">
import { ref, computed } from "vue";
import { useReportStore } from "@/stores/reportStore";
import { useToasterStore } from "@/stores/toasterStore";

const props = withDefaults(
  defineProps<{
    opened?: boolean;
    context?: "global" | "application";
    applicationId?: string;
  }>(),
  {
    opened: false,
    context: "global",
  },
);

const emit = defineEmits<{
  (e: "close"): void;
}>();

const toaster = useToasterStore();
const reportStore = useReportStore();

const description = ref("");
const isSubmitting = ref(false);
const errorMessage = ref<string>("");

const titleMapper = {
  application: "Proposer un signalement sur cette application",
  global: "Signaler une application manquante",
};
const title = computed(() => titleMapper[props.context]);

const placeholderMapper = {
  application: "Décrivez le signalement (champ à corriger, erreur constatée, etc.)…",
  global: "Décrivez l’application manquante (nom, URL, entité responsable, contexte)…",
};

const placeholder = computed(() => placeholderMapper[props.context]);

async function submitReport() {
  const desc = description.value;
  if (!desc) {
    errorMessage.value = "Veuillez décrire votre signalement.";
    return;
  }

  isSubmitting.value = true;
  try {
    if (props.context === "application") {
      if (!props.applicationId) throw new Error("applicationId manquant pour un signalement d'application");
      await reportStore.proposeReport(props.applicationId, desc);
    } else {
      await reportStore.proposeGlobalReport(desc);
    }

    toaster.addSuccessMessage("Merci pour votre signalement !");
    closeModal();
  } catch (error) {
    toaster.addErrorMessage("Une erreur est survenue lors de l'envoi du signalement");
    console.error("❌ submitReport:", error);
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
  <DsfrModal :opened="props.opened" :title="title" @close="closeModal">
    <div data-testid="report-modal">
      <DsfrAlert
        v-show="errorMessage.length > 0"
        class="mb-4"
        tabindex="-1"
        type="error"
        role="alert"
        aria-live="assertive"
        title="Une erreur est survenue"
        :description="errorMessage"
      />
      <DsfrInput v-model.trim="description" is-textarea :placeholder="placeholder" required rows="4" data-testid="report-description" />

      <DsfrButton data-testid="report-submit-btn" class="fr-mt-2w" :disabled="isSubmitting" :aria-busy="isSubmitting" @click="submitReport">
        {{ isSubmitting ? "Envoi…" : "Envoyer" }}
      </DsfrButton>
    </div>
  </DsfrModal>
</template>
