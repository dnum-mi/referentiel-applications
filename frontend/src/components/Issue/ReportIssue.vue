<script setup lang="ts">
import { ref, defineProps } from "vue";
import useToaster from "@/composables/use-toaster";
import type { Application } from "@/models/Application";
import { useReportIssueStore } from "@/stores/reportIssueStore";

const props = defineProps({
  application: {
    type: Object as () => Application,
    required: true,
  },
});

const reportIssueStore = useReportIssueStore();
const toaster = useToaster();

const application = ref<Application>(props.application);
const correctionText = ref("");
const opened = ref(false);

const submitCorrection = async () => {
  try {
    const applicationId = application.value?.id;
    if (!applicationId) throw new Error("Application ID is undefined");

    await reportIssueStore.proposeCorrection(applicationId, correctionText.value);
    await reportIssueStore.fetchIssueByApplication(applicationId);

    correctionText.value = "";
    opened.value = false;
    toaster.addSuccessMessage("Votre proposition sera prise en compte prochainement.");
  } catch (_error) {
    toaster.addErrorMessage("Oops ! Une erreur est survenue, contactez l’administrateur du référentiel si le problème persiste.");
  }
};
</script>

<template>
  <div class="correction-container">
    <DsfrInput
      is-textarea
      v-model="correctionText"
      placeholder="Écrivez votre correction..."
      required
      class="correction-textarea"
      rows="2"
    />
    <div class="button-left">
      <DsfrButton @click="submitCorrection" :disabled="!correctionText"> Proposer ma correction </DsfrButton>
    </div>
  </div>
</template>

<style scoped>
.correction-container {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  width: 100%;
}
</style>
