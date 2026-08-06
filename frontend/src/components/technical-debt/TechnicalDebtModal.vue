<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import type { TechnicalDebtInfoDto, CreateTechnicalDebtInfoDto } from "@/client/types.gen";
import { useToasterStore } from "@/stores/toasterStore";
import { useMditCampaigns } from "@/composables/use-mdit-campaigns";
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

const { campaigns, loadActiveCampaigns, latestYear } = useMditCampaigns();

// Millésimes sélectionnables : ceux des campagnes IT actives, complétés par celui du point
// en cours d'édition s'il n'y figure pas (cas d'une campagne devenue inactive depuis).
const millesimeOptions = computed(() => {
  const years = new Set(campaigns.value.map((campaign) => campaign.year));
  if (props.initialData?.millesime != null) years.add(props.initialData.millesime);
  return [...years].sort((a, b) => b - a).map((year) => ({ value: String(year), text: String(year) }));
});

// Par défaut : le millésime du point de dette technique en cours, sinon la campagne IT la plus récente.
const form = ref({
  millesime: toInputValue(props.initialData?.millesime ?? latestYear.value),
  technicalMaturity: toInputValue(props.initialData?.technicalMaturity),
  businessMaturity: toInputValue(props.initialData?.businessMaturity),
  costContainment: toInputValue(props.initialData?.costContainment),
});

// 12.8 : à l'ouverture, porter le focus sur le premier élément interactif de la modale (bouton « Fermer »).
onMounted(async () => {
  await loadActiveCampaigns();
  if (!form.value.millesime) form.value.millesime = toInputValue(latestYear.value);
  await nextTick();
  document.querySelector<HTMLButtonElement>('[data-testid="technical-debt-modal"] .fr-btn--close')?.focus();
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

function isValidMillesime(value: string): boolean {
  return millesimeOptions.value.some((option) => option.value === value);
}

async function handleSubmit() {
  isSubmitting.value = true;

  if (!isValidMillesime(form.value.millesime)) {
    isSubmitting.value = false;
    toaster.addErrorMessage("Le millésime doit être une année valide.");
    return;
  }

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
    millesime: Number(form.value.millesime),
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
        <DsfrSelect
          v-model="form.millesime"
          label="Millésime"
          label-visible
          :options="millesimeOptions"
          hint="Campagne dette IT"
          class="fr-mb-3w"
          data-testid="millesime-select"
        />
        <DsfrInput
          v-model="form.technicalMaturity"
          label-visible
          type="number"
          min="1"
          max="5"
          step=".01"
          hint="Entre 1 et 5 (laisser vide si non noté)"
          aria-describedby="technical-maturity-tooltip-desc"
          class="fr-mb-3w"
          data-testid="technical-maturity-select"
        >
          <template #label>
            <span class="tooltip-label">
              Maturité technique
              <DsfrTooltip
                id="technical-maturity-tooltip-desc"
                content="Évalue la qualité de l'architecture, la maintenabilité et la santé technologique de l'application : dette technique, obsolescence, sécurité, fiabilité, conformité aux standards."
              />
            </span>
          </template>
        </DsfrInput>
        <DsfrInput
          v-model="form.businessMaturity"
          label-visible
          type="number"
          min="1"
          max="5"
          step=".01"
          hint="Entre 1 et 5 (laisser vide si non noté)"
          aria-describedby="business-maturity-tooltip-desc"
          class="fr-mb-3w"
          data-testid="business-maturity-select"
        >
          <template #label>
            <span class="tooltip-label">
              Maturité métier
              <DsfrTooltip
                id="business-maturity-tooltip-desc"
                content="Évalue dans quelle mesure l'application répond aux besoins métier et soutient les objectifs stratégiques et opérationnels : couverture fonctionnelle, satisfaction des utilisateurs, criticité."
              />
            </span>
          </template>
        </DsfrInput>
        <DsfrInput
          v-model="form.costContainment"
          label-visible
          type="number"
          min="1"
          max="5"
          step=".01"
          hint="Entre 1 et 5 (laisser vide si non noté)"
          aria-describedby="cost-containment-tooltip-desc"
          class="fr-mb-3w"
          data-testid="cost-containment-select"
        >
          <template #label>
            <span class="tooltip-label">
              Maîtrise des coûts
              <DsfrTooltip
                id="cost-containment-tooltip-desc"
                content="Évalue le niveau de visibilité et de maîtrise du coût total de possession (TCO) de l'application : licences, maintenance, hébergement, support interne et externe."
              />
            </span>
          </template>
        </DsfrInput>
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

<style scoped>
.tooltip-label {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  position: relative;
}

:deep(.fr-tooltip) {
  position: absolute !important;
  top: 100% !important;
  left: 0 !important;
  transform: none !important;
  margin-top: 0.25rem;
  max-width: 220px;
}
</style>
