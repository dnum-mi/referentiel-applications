<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { type ApplicationDto, Permission } from "@/client/types.gen";
import { useAppPermission } from "@/composables/use-app-permission";
import type { ApplicationFormInitialData } from "@/models/Application";
import ApplicationMainStep from "./application/ApplicationMainStep.vue";
import ApplicationDetailsStep from "./application/ApplicationDetailsStep.vue";
import ApplicationMoaStep from "./application/ApplicationMoaStep.vue";
import ApplicationMoeStep from "./application/ApplicationMoeStep.vue";
import {
  applicationFormSteps,
  type ApplicationFormIssue,
  type ApplicationFormMode,
  type ApplicationFormStep,
  type ApplicationStepHandle,
} from "./application/application-form.types";
import { useApplicationFormValidation } from "./application/application-form.validation";
import { useApplicationFormState } from "./application/use-application-form-state";
import { useApplicationFormActions } from "./application/use-application-form-actions";

const props = withDefaults(defineProps<{ mode?: ApplicationFormMode; initialData: ApplicationFormInitialData }>(), { mode: "create" });
const emit = defineEmits<{ success: [application: ApplicationDto]; cancel: [] }>();
const { form, moa, moe, isCreateFormDirty, getData } = useApplicationFormState(props.initialData, () => props.mode);
const { errors, validateStep, validateAll } = useApplicationFormValidation(getData, () => props.mode);
const { save, isSubmitting, syncContact, moaSyncing, moeSyncing, initialMoaOrganization, initialMoeOrganization } =
  useApplicationFormActions(
    getData,
    () => props.mode,
    () => props.initialData.id,
  );
const isCreateMode = computed(() => props.mode === "create");
const hasAppWrite = useAppPermission(() => props.initialData.myPerms, [Permission.APP_WRITE]);
const hasAppWritePriority = useAppPermission(() => props.initialData.myPerms, [Permission.APP_WRITE_PRIORITY]);
const canEditBase = computed(() => isCreateMode.value || hasAppWrite.value);
const canEditPriorityRestart = computed(() => isCreateMode.value || hasAppWritePriority.value);
const currentStep = ref<ApplicationFormStep>(1);
const formElement = ref<HTMLFormElement | null>(null);
const mainStep = ref<ApplicationStepHandle | null>(null);
const moaStep = ref<ApplicationStepHandle | null>(null);
const moeStep = ref<ApplicationStepHandle | null>(null);
const cancelModalOpen = ref(false);
const cancelOrigin = ref<HTMLElement | null>(null);

async function focusErrors(issues: ApplicationFormIssue[]) {
  const first = issues[0];
  if (!first) return;
  if (isCreateMode.value) currentStep.value = first.step;
  await nextTick();
  const step = first.step === 1 ? mainStep.value : first.step === 3 ? moaStep.value : moeStep.value;
  await step?.focusField(first.field);
}

async function changeStep(step: ApplicationFormStep) {
  currentStep.value = step;
  await nextTick();
  formElement.value?.querySelector<HTMLElement>(`[data-testid="application-step-title-${step}"]`)?.focus();
}

async function nextStep() {
  const issues = validateStep(currentStep.value);
  if (issues.length) return focusErrors(issues);
  if (currentStep.value < 4) await changeStep((currentStep.value + 1) as ApplicationFormStep);
}

async function previousStep() {
  if (currentStep.value > 1) await changeStep((currentStep.value - 1) as ApplicationFormStep);
}

async function handleSubmit() {
  if (isSubmitting.value) return;
  const issues = validateAll();
  if (issues.length) return focusErrors(issues);
  const application = await save();
  if (application) emit("success", application);
}

function handleCancel(event: MouseEvent) {
  if (!isCreateFormDirty.value) return emit("cancel");
  cancelOrigin.value = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  cancelModalOpen.value = true;
}

async function closeCancelModal() {
  cancelModalOpen.value = false;
  await nextTick();
  cancelOrigin.value?.focus();
}

function confirmCancel() {
  cancelModalOpen.value = false;
  emit("cancel");
}
</script>

<template>
  <DsfrStepper v-if="isCreateMode" :steps="applicationFormSteps" :current-step="currentStep" class="fr-mb-4w" />
  <form ref="formElement" data-testid="application-form" novalidate @submit.prevent="handleSubmit">
    <p class="fr-text--sm fr-mb-3w" data-testid="required-fields-hint">Tous les champs avec un * sont obligatoires</p>
    <ApplicationMainStep
      v-if="!isCreateMode || currentStep === 1"
      ref="mainStep"
      v-model="form"
      :errors="errors"
      :is-create-mode="isCreateMode"
      :can-edit-base="canEditBase"
    />
    <ApplicationDetailsStep
      v-if="!isCreateMode || currentStep === 2"
      v-model="form"
      :is-create-mode="isCreateMode"
      :can-edit-base="canEditBase"
      :can-edit-priority-restart="canEditPriorityRestart"
    />
    <ApplicationMoaStep
      v-if="isCreateMode && currentStep === 3"
      ref="moaStep"
      v-model="moa"
      :errors="errors"
      :initial-organization="initialMoaOrganization"
      :is-syncing="moaSyncing"
      @sync="syncContact('moa')"
    />
    <ApplicationMoeStep
      v-if="isCreateMode && currentStep === 4"
      ref="moeStep"
      v-model="moe"
      :errors="errors"
      :initial-organization="initialMoeOrganization"
      :is-syncing="moeSyncing"
      @sync="syncContact('moe')"
    />
    <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
      <DsfrButton type="button" secondary label="Annuler" data-testid="application-cancel-btn" @click="handleCancel" />
      <DsfrButton
        v-if="isCreateMode && currentStep > 1"
        type="button"
        label="Précédent"
        icon="ri-arrow-left-line"
        data-testid="application-previous-btn"
        @click="previousStep"
      />
      <DsfrButton
        v-if="isCreateMode && currentStep < 4"
        type="button"
        label="Suivant"
        icon="ri-arrow-right-line"
        icon-right
        data-testid="application-next-btn"
        @click="nextStep"
      />
      <DsfrButton
        v-else
        type="submit"
        :disabled="isSubmitting"
        :label="isSubmitting ? 'Enregistrement...' : 'Enregistrer'"
        data-testid="application-submit-btn"
      />
    </div>
  </form>
  <DsfrModal
    :opened="cancelModalOpen"
    :origin="cancelOrigin ?? undefined"
    title="Annuler la création de l'application"
    size="sm"
    data-testid="application-cancel-modal"
    @close="closeCancelModal"
  >
    <p>Vous avez commencé à remplir le formulaire. Voulez-vous vraiment annuler et perdre les modifications en cours ?</p>
    <div class="actions">
      <DsfrButton type="button" tertiary data-testid="application-cancel-modal-close" @click="closeCancelModal">Reprendre</DsfrButton>
      <DsfrButton type="button" primary data-testid="application-cancel-modal-confirm" @click="confirmCancel">Confirmer</DsfrButton>
    </div>
  </DsfrModal>
</template>
