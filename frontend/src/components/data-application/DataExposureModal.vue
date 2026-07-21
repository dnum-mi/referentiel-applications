<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import api from "@/api/index";
import type { DataExposureDto } from "@/client/types.gen";
import { useToasterStore } from "@/stores/toasterStore";

const props = defineProps<{
  applicationId: string;
  dataApplicationId: string;
  initialExposure?: DataExposureDto;
  errorMessage: string;
}>();

const emit = defineEmits(["close", "exposureCreated", "exposureUpdated"]);

const toaster = useToasterStore();
const isSubmitting = ref(false);
const typeError = ref<string | undefined>(undefined);

const form = ref({
  type: "",
  format: "",
  endpoint: "",
  url: "",
  swaggerUrl: "",
  authenticationType: "",
});

function setInitialValues() {
  if (!props.initialExposure) {
    form.value = { type: "", format: "", endpoint: "", url: "", swaggerUrl: "", authenticationType: "" };
    return;
  }
  form.value = {
    type: props.initialExposure.type ?? "",
    format: props.initialExposure.format ?? "",
    endpoint: props.initialExposure.endpoint ?? "",
    url: props.initialExposure.url ?? "",
    swaggerUrl: props.initialExposure.swaggerUrl ?? "",
    authenticationType: props.initialExposure.authenticationType ?? "",
  };
}

watch(() => props.initialExposure, setInitialValues, { immediate: true });

onMounted(async () => {
  await nextTick();
  document.querySelector<HTMLButtonElement>('[data-testid="data-exposure-modal"] .fr-btn--close')?.focus();
});

async function handleSubmit() {
  typeError.value = form.value.type.trim() ? undefined : "Veuillez renseigner un type d'exposition.";
  if (typeError.value) return;

  isSubmitting.value = true;
  try {
    const body = {
      type: form.value.type.trim(),
      format: form.value.format || undefined,
      endpoint: form.value.endpoint || undefined,
      url: form.value.url || undefined,
      swaggerUrl: form.value.swaggerUrl || undefined,
      authenticationType: form.value.authenticationType || undefined,
    };

    if (props.initialExposure) {
      const response = await api.dataCatalogControllerUpdateExposure({
        path: { applicationId: props.applicationId, dataApplicationId: props.dataApplicationId, exposureId: props.initialExposure.id },
        body,
      });
      if (!response.response.ok) throw new Error("update failed");
      toaster.addSuccessMessage("Exposition mise à jour avec succès");
      emit("exposureUpdated");
    } else {
      const response = await api.dataCatalogControllerCreateExposure({
        path: { applicationId: props.applicationId, dataApplicationId: props.dataApplicationId },
        body,
      });
      if (!response.response.ok) throw new Error("create failed");
      toaster.addSuccessMessage("Exposition créée avec succès");
      emit("exposureCreated");
    }
    emit("close");
  } catch (error) {
    console.error("Error submitting exposure form:", error);
    toaster.addErrorMessage("Une erreur est survenue lors de l'enregistrement de l'exposition.");
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <DsfrModal
    :opened="true"
    :title="props.initialExposure ? 'Modifier une exposition' : 'Ajouter une exposition'"
    data-testid="data-exposure-modal"
    @close="$emit('close')"
  >
    <DsfrAlert
      v-show="props.initialExposure && props.errorMessage.length > 0"
      class="mb-4"
      tabindex="-1"
      type="error"
      role="alert"
      aria-live="assertive"
      title="Une erreur est survenue"
      :description="props.errorMessage"
    />
    <form data-testid="data-exposure-form" @submit.prevent="handleSubmit">
      <p class="fr-text--sm fr-mb-2w" data-testid="required-fields-hint">Tous les champs avec un * sont obligatoires</p>

      <DsfrInput
        v-model="form.type"
        label="Type"
        label-visible
        required
        hint="Ex : API, Fichier, Flux"
        class="fr-mb-3w"
        :error-message="typeError"
        data-testid="data-exposure-type-input"
      />

      <DsfrInput
        v-model="form.format"
        label="Format"
        label-visible
        hint="Ex : JSON, CSV, XML"
        class="fr-mb-3w"
        data-testid="data-exposure-format-input"
      />

      <DsfrInput
        v-model="form.endpoint"
        label="Point de terminaison technique"
        label-visible
        class="fr-mb-3w"
        data-testid="data-exposure-endpoint-input"
      />

      <DsfrInput
        v-model="form.url"
        label="URL d'accès à la ressource"
        label-visible
        class="fr-mb-3w"
        data-testid="data-exposure-url-input"
      />

      <DsfrInput
        v-model="form.swaggerUrl"
        label="URL Swagger / OpenAPI"
        label-visible
        class="fr-mb-3w"
        data-testid="data-exposure-swagger-url-input"
      />

      <DsfrInput
        v-model="form.authenticationType"
        label="Type d'authentification"
        label-visible
        hint="Ex : OAuth2, API Key"
        class="fr-mb-3w"
        data-testid="data-exposure-authentication-type-input"
      />

      <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
        <DsfrButton type="button" secondary label="Annuler" data-testid="data-exposure-cancel-btn" @click="$emit('close')" />
        <DsfrButton
          type="submit"
          :disabled="isSubmitting"
          :label="props.initialExposure ? 'Modifier' : 'Ajouter'"
          data-testid="data-exposure-submit-btn"
        >
          <template v-if="isSubmitting">
            <span class="fr-loading fr-loading--sm" data-testid="data-exposure-submit-loading">
              <span class="fr-loading__icon" aria-hidden="true" />
            </span>
          </template>
        </DsfrButton>
      </div>
    </form>
  </DsfrModal>
</template>
