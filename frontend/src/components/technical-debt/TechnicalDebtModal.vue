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

const maturityOptions = [
  { value: "", text: "Non défini" },
  { value: 0, text: "0 - Très faible" },
  { value: 1, text: "1 - Faible" },
  { value: 2, text: "2 - Moyen" },
  { value: 3, text: "3 - Correct" },
  { value: 4, text: "4 - Bon" },
  { value: 5, text: "5 - Excellent" },
];

const form = ref({
  technicalMaturity: props.initialData?.technicalMaturity ?? "",
  businessMaturity: props.initialData?.businessMaturity ?? "",
  costMaturity: props.initialData?.costMaturity ?? "",
});

function toNullable(value: number | string): number | null {
  return value === "" || Number.isNaN(value) ? null : Number(value);
}

async function handleSubmit() {
  isSubmitting.value = true;

  const body: CreateTechnicalDebtInfoDto = {
    technicalMaturity: toNullable(form.value.technicalMaturity),
    businessMaturity: toNullable(form.value.businessMaturity),
    costMaturity: toNullable(form.value.costMaturity),
  };

  const apiCall = isEditMode.value ? api.applicationTechnicalDebtInfoControllerUpdate : api.applicationTechnicalDebtInfoControllerCreate;

  const response = await apiCall({ path: { applicationId: props.applicationId }, body });

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
        <DsfrSelect
          v-model.number="form.technicalMaturity"
          label="Maturité technique"
          :options="maturityOptions"
          class="fr-mb-3w"
          data-testid="technical-maturity-select"
        />
        <DsfrSelect
          v-model.number="form.businessMaturity"
          label="Maturité métier"
          :options="maturityOptions"
          class="fr-mb-3w"
          data-testid="business-maturity-select"
        />
        <DsfrSelect
          v-model.number="form.costMaturity"
          label="Maturité des coûts"
          :options="maturityOptions"
          class="fr-mb-3w"
          data-testid="cost-maturity-select"
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
