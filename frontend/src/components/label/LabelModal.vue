<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from "vue";
import api from "@/api/index";
import { useToasterStore } from "@/stores/toasterStore";
import type { LabelDto, LabelSourceDto } from "@/client/types.gen";

const props = defineProps<{
  applicationId: string;
  initialLabel?: LabelDto;
  errorMessage: string;
}>();

const emit = defineEmits(["close", "labelCreated", "labelUpdated"]);

const labelForm = ref({
  labelSourceId: "",
  value: "",
});

const labelSourcesList = ref<LabelSourceDto[]>([]);
const isLoadingSources = ref(false);
const labelSourceSearch = ref("");
const isSubmitting = ref(false);
const valueError = ref<string | undefined>(undefined);
const toaster = useToasterStore();

watch(labelSourceSearch, (newValue) => {
  const matchedSource = labelSourcesList.value.find((source) => source.source === newValue);

  labelForm.value.labelSourceId = matchedSource?.id || "";
});

async function fetchLabelSources() {
  try {
    isLoadingSources.value = true;
    const response = await api.labelSourceControllerFindAll({ query: { pageSize: 0 } });
    labelSourcesList.value = response.data?.results ?? [];
  } catch {
    toaster.addErrorMessage("Erreur lors du chargement des sources de noms alternatifs.");
  } finally {
    isLoadingSources.value = false;
  }
}

onMounted(fetchLabelSources);

// 12.8 : à l'ouverture, porter le focus sur le premier élément interactif de la modale (bouton « Fermer »).
onMounted(async () => {
  await nextTick();
  document.querySelector<HTMLButtonElement>('[data-testid="label-modal"] .fr-btn--close')?.focus();
});

function setInitialValues() {
  const label = props.initialLabel;

  labelForm.value = {
    labelSourceId: label?.labelSourceId ?? "",
    value: label?.value ?? "",
  };

  labelSourceSearch.value = labelSourcesList.value.find((source) => source.id === label?.labelSourceId)?.source ?? "";
}

watch(() => props.initialLabel, setInitialValues, { immediate: true });
watch(labelSourcesList, setInitialValues, { immediate: true });

async function handleSubmit() {
  valueError.value = labelForm.value.value.trim() ? undefined : "Veuillez compléter le champ : Valeur";
  if (valueError.value) return;

  isSubmitting.value = true;
  try {
    if (props.initialLabel) {
      const response = await api.labelsControllerUpdate({
        path: { applicationId: props.applicationId, id: props.initialLabel.id },
        body: labelForm.value,
      });
      if (!response.response.ok) {
        toaster.addErrorMessage("Erreur lors de la mise à jour du nom alternatif");
        throw new Error(`Failed to update label: ${response.response.statusText}`);
      }
      toaster.addSuccessMessage("Nom alternatif mis à jour avec succès");
      emit("labelUpdated");
    } else {
      const response = await api.labelsControllerCreate({
        path: { applicationId: props.applicationId },
        body: labelForm.value,
      });
      if (!response.response.ok) {
        toaster.addErrorMessage("Erreur lors de la création du nom alternatif");
        throw new Error(`Failed to create label: ${response.response.statusText}`);
      }
      toaster.addSuccessMessage("Nom alternatif créé avec succès");
      emit("labelCreated");
    }
    emit("close");
  } catch {
    toaster.addErrorMessage("Une erreur est survenue lors de l'enregistrement du nom alternatif");
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <DsfrModal
    :opened="true"
    :title="props.initialLabel ? 'Modifier un nom alternatif' : 'Créer un nom alternatif'"
    data-testid="label-modal"
    @close="$emit('close')"
  >
    <DsfrAlert
      v-show="props.initialLabel && props.errorMessage.length > 0"
      class="mb-4"
      tabindex="-1"
      type="error"
      role="alert"
      aria-live="assertive"
      title="Une erreur est survenue"
      :description="props.errorMessage"
    />
    <form data-testid="label-form" @submit.prevent="handleSubmit">
      <p class="fr-text--sm fr-mb-2w" data-testid="required-fields-hint">Tous les champs avec un * sont obligatoires</p>
      <div v-if="isLoadingSources" class="fr-text--center fr-mb-2w" data-testid="label-sources-loading">
        <span class="fr-loading fr-loading--sm" data-testid="label-sources-spinner">
          <span class="fr-loading__icon" aria-hidden="true" />
        </span>
        Chargement des sources...
      </div>
      <div v-else class="fr-form-group">
        <DsfrInputGroup
          v-model="labelForm.value"
          required
          label-visible
          label="Valeur"
          class="fr-mb-3w"
          :error-message="valueError"
          data-testid="label-value-input"
        />
        <DsfrInput
          v-model="labelSourceSearch"
          label-visible
          label="Source de noms"
          hint="Commencez à taper pour rechercher"
          list="labelSourcesList"
          class="fr-mb-3w"
          data-testid="label-source-search-input"
        />
        <datalist id="labelSourcesList" data-testid="label-sources-list">
          <option v-for="source in labelSourcesList" :key="source.id" :data-testid="`label-source-${source.id}`">
            {{ source.source }}
          </option>
        </datalist>
      </div>
      <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
        <DsfrButton type="button" secondary label="Annuler" data-testid="label-cancel-btn" @click="$emit('close')" />
        <DsfrButton
          type="submit"
          :disabled="isSubmitting || isLoadingSources"
          :label="props.initialLabel ? 'Modifier' : 'Créer'"
          data-testid="label-submit-btn"
        >
          <template v-if="isSubmitting">
            <span class="fr-loading fr-loading--sm" data-testid="label-submit-loading">
              <span class="fr-loading__icon" aria-hidden="true" />
            </span>
          </template>
        </DsfrButton>
      </div>
    </form>
  </DsfrModal>
</template>
