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

const title = "Proposer une correction";
const hint = `Veuillez renseigner votre correction détectée pour l'application "${application.value?.label || ""}"`;
const label = "Proposition";

const submitCorrection = async () => {
  try {
    const applicationId = application.value?.id;
    if (!applicationId) throw new Error("Application ID is undefined");

    await reportIssueStore.proposeCorrection(applicationId, correctionText.value);
    await reportIssueStore.fetchIssueByApplication(applicationId);

    correctionText.value = "";
    opened.value = false;
    toaster.addSuccessMessage("Votre proposition sera prise en compte prochainement.");
  } catch (error) {
    toaster.addErrorMessage("Oops ! Une erreur est survenue, contactez l’administrateur du référentiel si le problème persiste.");
  }
};
</script>

<template>
  <div class="fr-container fr-my-2v">
    <DsfrButton @click="opened = true">Proposer une correction</DsfrButton>

    <DsfrModal v-model:opened="opened" :title="title" @close="opened = false">
      <template #default>
        <h2>{{ application?.label }}</h2>

        <DsfrInput is-textarea v-model="correctionText" :hint="hint" :label="label" label-visible required />

        <div class="button-right">
          <DsfrButton @click="submitCorrection" :disabled="!correctionText"> Soumettre ma proposition </DsfrButton>
        </div>
      </template>
    </DsfrModal>
  </div>
</template>
