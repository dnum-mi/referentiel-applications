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
        label-visible
        required
        hint="Ex : API, Fichier, Flux"
        aria-describedby="data-exposure-type-tooltip-desc"
        class="fr-mb-3w"
        :error-message="typeError"
        data-testid="data-exposure-type-input"
      >
        <template #label>
          <span class="tooltip-label">
            Type
            <DsfrTooltip
              id="data-exposure-type-tooltip-desc"
              content="Mode d'exposition technique de la donnée : décrit COMMENT elle est mise à disposition (ex : API REST, fichier plat, flux)."
            />
          </span>
        </template>
      </DsfrInput>

      <DsfrInput
        v-model="form.format"
        label-visible
        hint="Ex : JSON, CSV, XML"
        aria-describedby="data-exposure-format-tooltip-desc"
        class="fr-mb-3w"
        data-testid="data-exposure-format-input"
      >
        <template #label>
          <span class="tooltip-label">
            Format
            <DsfrTooltip
              id="data-exposure-format-tooltip-desc"
              content="Format des données échangées lors de cette exposition (ex : JSON, CSV, XML)."
            />
          </span>
        </template>
      </DsfrInput>

      <DsfrInput
        v-model="form.endpoint"
        label-visible
        aria-describedby="data-exposure-endpoint-tooltip-desc"
        class="fr-mb-3w"
        data-testid="data-exposure-endpoint-input"
      >
        <template #label>
          <span class="tooltip-label">
            Point de terminaison technique
            <DsfrTooltip
              id="data-exposure-endpoint-tooltip-desc"
              content="Chemin ou identifiant technique du point d'accès (ex : /api/v2/donnee), à distinguer de l'URL complète."
            />
          </span>
        </template>
      </DsfrInput>

      <DsfrInput
        v-model="form.url"
        label-visible
        aria-describedby="data-exposure-url-tooltip-desc"
        class="fr-mb-3w"
        data-testid="data-exposure-url-input"
      >
        <template #label>
          <span class="tooltip-label">
            URL d'accès à la ressource
            <DsfrTooltip
              id="data-exposure-url-tooltip-desc"
              content="Adresse complète permettant d'accéder directement à la donnée exposée."
            />
          </span>
        </template>
      </DsfrInput>

      <DsfrInput
        v-model="form.swaggerUrl"
        label-visible
        aria-describedby="data-exposure-swagger-url-tooltip-desc"
        class="fr-mb-3w"
        data-testid="data-exposure-swagger-url-input"
      >
        <template #label>
          <span class="tooltip-label">
            URL Swagger / OpenAPI
            <DsfrTooltip
              id="data-exposure-swagger-url-tooltip-desc"
              content="Lien vers la documentation technique de l'API (spécification Swagger/OpenAPI), si disponible."
            />
          </span>
        </template>
      </DsfrInput>

      <DsfrInput
        v-model="form.authenticationType"
        label-visible
        hint="Ex : OAuth2, API Key"
        aria-describedby="data-exposure-authentication-type-tooltip-desc"
        class="fr-mb-3w"
        data-testid="data-exposure-authentication-type-input"
      >
        <template #label>
          <span class="tooltip-label">
            Type d'authentification
            <DsfrTooltip
              id="data-exposure-authentication-type-tooltip-desc"
              content="Mécanisme de sécurité requis pour accéder à cette exposition (ex : OAuth2, clé d'API, aucune)."
            />
          </span>
        </template>
      </DsfrInput>

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

<style scoped>
/* `DsfrTooltip` positionne sa bulle via un `transform` calculé en JS par rapport à la largeur de LA
   FENÊTRE entière, pas de la modale (plus étroite et centrée) : la bulle peut rester « dans l'écran »
   selon son propre calcul tout en débordant largement de la modale (bug constaté, y compris après
   un simple passage en `position: absolute`). On ignore complètement ce calcul et on ancre la bulle
   nous-mêmes, juste en dessous de son champ, avec une largeur volontairement réduite : garanti de
   tenir dans la modale quelle que soit la position du champ. */
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
