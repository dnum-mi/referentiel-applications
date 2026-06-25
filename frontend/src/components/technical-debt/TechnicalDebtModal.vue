<script setup lang="ts">
import { ref, computed } from "vue";
import type { TechnicalDebtInfoDto, CreateTechnicalDebtInfoDto } from "@/client/types.gen";
import { useToasterStore } from "@/stores/toasterStore";
import api from "@/api/index.js";

const props = defineProps<{
  applicationId: string;
  initialData?: TechnicalDebtInfoDto | null;
}>();

const emit = defineEmits<{
  close: [];
  saved: [data: TechnicalDebtInfoDto];
}>();

const toaster = useToasterStore();
const isSubmitting = ref(false);
const isEditMode = computed(() => !!props.initialData);

// Champ vide = score non noté (`null`). Une valeur saisie doit être comprise entre 1 et 5.
function toInputValue(value: number | string | null | undefined): string {
  if (value == null) return "";
  return String(value);
}

const form = ref({
  technicalMaturity: toInputValue(props.initialData?.technicalMaturity),
  businessMaturity: toInputValue(props.initialData?.businessMaturity),
  costContainment: toInputValue(props.initialData?.costContainment),
});

// Renvoie le score saisi (1-5) ou `undefined` si le champ est vide (non noté).
function toScoreOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

// Un champ est valide s'il est vide (non noté) ou contient une valeur entre 1 et 5.
function isValidScore(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return true;
  const parsed = Number(trimmed);
  return !Number.isNaN(parsed) && parsed >= 1 && parsed <= 5;
}

async function handleSubmit() {
  isSubmitting.value = true;

  if (
    !isValidScore(form.value.technicalMaturity) ||
    !isValidScore(form.value.businessMaturity) ||
    !isValidScore(form.value.costContainment)
  ) {
    isSubmitting.value = false;
    toaster.addErrorMessage("Les valeurs de maturité doivent être comprises entre 1 et 5 (ou laissées vides).");
    return;
  }

  const body: CreateTechnicalDebtInfoDto = {
    technicalMaturity: toScoreOrUndefined(form.value.technicalMaturity),
    businessMaturity: toScoreOrUndefined(form.value.businessMaturity),
    costContainment: toScoreOrUndefined(form.value.costContainment),
  };

  const response = await api.applicationTechnicalDebtInfoControllerCreate({ path: { applicationId: props.applicationId }, body });

  isSubmitting.value = false;

  if (!response.response.ok || !response.data) {
    toaster.addErrorMessage("Erreur lors de l'enregistrement des informations de dette technique.");
    return;
  }

  toaster.addSuccessMessage(`Informations de dette technique ${isEditMode.value ? "mises à jour" : "créées"} avec succès !`);
  emit("saved", response.data);
  emit("close");
}
</script>

<template>
  <DsfrModal
    :opened="true"
    :title="isEditMode ? 'Modifier la dette technique' : 'Créer la dette technique'"
    data-testid="technical-debt-modal"
    @close="$emit('close')"
  >
    <form data-testid="technical-debt-form" @submit.prevent="handleSubmit">
      <div class="fr-form-group">
        <DsfrInput
          v-model="form.technicalMaturity"
          label="Maturité technique"
          label-visible
          type="number"
          min="1"
          max="5"
          step=".01"
          hint="Entre 1 et 5 (laisser vide si non noté)"
          class="fr-mb-3w"
          data-testid="technical-maturity-select"
        />
        <DsfrInput
          v-model="form.businessMaturity"
          label="Maturité métier"
          label-visible
          type="number"
          min="1"
          max="5"
          step=".01"
          hint="Entre 1 et 5 (laisser vide si non noté)"
          class="fr-mb-3w"
          data-testid="business-maturity-select"
        />
        <DsfrInput
          v-model="form.costContainment"
          label="Maîtrise des coûts"
          label-visible
          type="number"
          min="1"
          max="5"
          step=".01"
          hint="Entre 1 et 5 (laisser vide si non noté)"
          class="fr-mb-3w"
          data-testid="cost-containment-select"
        />
      </div>
      <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
        <DsfrButton type="button" secondary label="Annuler" data-testid="technical-debt-cancel-btn" @click="$emit('close')" />
        <DsfrButton
          type="submit"
          :disabled="isSubmitting"
          :label="isEditMode ? 'Modifier' : 'Créer'"
          data-testid="technical-debt-submit-btn"
        >
          <template v-if="isSubmitting">
            <span class="fr-loading fr-loading--sm" data-testid="technical-debt-submit-loading">
              <span class="fr-loading__icon" aria-hidden="true" />
            </span>
          </template>
        </DsfrButton>
      </div>
    </form>
  </DsfrModal>
</template>
