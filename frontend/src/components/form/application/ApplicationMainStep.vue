<script setup lang="ts">
import { nextTick, ref } from "vue";
import type { ApplicationStatus, ApplicationType } from "@/client/types.gen";
import BusinessDivisionSearch from "@/components/business-division/BusinessDivisionSearch.vue";
import MarkdownEditor from "@/components/MarkdownEditor.vue";
import { statusApplicationDictionary, typeApplicationDictionary } from "@/constants/dictionary";
import type { ApplicationFormErrors, ApplicationFormField, ApplicationFormState } from "./application-form.types";
import { applicationFormSteps } from "./application-form.types";

defineProps<{ errors: ApplicationFormErrors; isCreateMode: boolean; canEditBase: boolean }>();
const form = defineModel<ApplicationFormState>({ required: true });
const container = ref<HTMLElement | null>(null);
const descriptionEditor = ref<InstanceType<typeof MarkdownEditor> | null>(null);

const statusOptions = Object.entries(statusApplicationDictionary).map(([value, text]) => ({ value: value as ApplicationStatus, text }));
const typeOptions = Object.entries(typeApplicationDictionary).map(([value, text]) => ({ value: value as ApplicationType, text }));

async function focusField(field: ApplicationFormField) {
  await nextTick();
  if (field === "description") return descriptionEditor.value?.focus();
  if (field === "label") container.value?.querySelector<HTMLInputElement>('[data-testid="application-label"]')?.focus();
}

defineExpose({ focusField });
</script>

<template>
  <div ref="container" class="fr-card fr-p-3w">
    <h3 tabindex="-1" class="fr-mb-3w" data-testid="application-step-title-1">
      <template v-if="isCreateMode">Étape 1 sur {{ applicationFormSteps.length }} — </template>Informations principales
    </h3>

    <DsfrInputGroup
      id="application-label"
      v-model.trim="form.label"
      :disabled="!canEditBase"
      hint="Doit contenir au moins une lettre.
Seuls les lettres (avec accents), chiffres, espaces, points et tirets sont autorisés.
Aucun espace en début ou en fin."
      label="Nom de l'application"
      label-visible
      required
      description-id="application-label-error"
      :error-message="errors.label"
      :aria-invalid="errors.label ? true : undefined"
      data-testid="application-label"
    />

    <DsfrInputGroup
      v-model.trim="form.shortName"
      :disabled="!canEditBase"
      class="fr-mt-3w"
      label="Nom court"
      label-visible
      hint="Optionnel - Un nom court pour identifier rapidement l'application"
      data-testid="application-shortname"
    />

    <DsfrSelect
      v-if="isCreateMode"
      v-model="form.status.status"
      :options="statusOptions"
      label="Status de l'application"
      default-unselected-text="Sélectionner un status"
      data-testid="application-status"
    />

    <BusinessDivisionSearch v-model:business-division-ids="form.businessDivisionIds" label="Rechercher une direction de metier" />

    <DsfrSelect
      v-model="form.type"
      :options="typeOptions"
      :disabled="!canEditBase"
      label="Type d'application"
      default-unselected-text="Sélectionner un type"
      data-testid="application-type"
    />

    <DsfrInputGroup
      class="fr-mt-3w"
      label="Description"
      label-visible
      required
      description-id="application-description-error"
      :error-message="errors.description"
    >
      <MarkdownEditor
        ref="descriptionEditor"
        v-model.trim="form.description"
        :disabled="!canEditBase"
        aria-label="Description"
        :describedby="errors.description ? 'application-description-error' : undefined"
        :invalid="!!errors.description"
        data-testid="application-description"
      />
    </DsfrInputGroup>

    <DsfrInputGroup
      v-if="!isCreateMode"
      v-model.trim="form.logo"
      :disabled="!canEditBase"
      class="fr-mt-3w"
      label="URL du logo"
      label-visible
      hint="Optionnel - URL d'une image représentant l'application"
      data-testid="application-logo"
    />
  </div>
</template>
