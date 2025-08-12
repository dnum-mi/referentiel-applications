<script setup lang="ts">
import { ref, defineProps } from "vue";
import { useToasterStore } from "@/stores/toasterStore";
import type { ApplicationWithPerms } from "@/models/Application";
import { useReportIssueStore } from "@/stores/reportIssueStore";

const props = defineProps<{
  application: ApplicationWithPerms
}>();

const reportIssueStore = useReportIssueStore();
const toaster = useToasterStore();

const application = ref<ApplicationWithPerms>(props.application);
const correctionText = ref("");
const opened = ref(false);

async function submitCorrection() {
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
}
</script>

<template>
  <div class="correction-container">
    <DsfrInput
      v-model="correctionText"
      is-textarea
      placeholder="Écrivez votre correction..."
      required
      class="correction-textarea"
      rows="2"
    />
    <div class="button-left">
      <DsfrButton :disabled="!correctionText" @click="submitCorrection">
        Proposer ma correction
      </DsfrButton>
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
