<script setup lang="ts">
import { ref, computed } from "vue";
import type { PropType } from "vue";
import type { LinkDto } from "@/client/types.gen";
import { linkTypesDict } from "@/constants/dictionary";

const props = defineProps({
  initialData: {
    type: Object as PropType<LinkDto>,
    required: false,
  },
  isSubmitting: {
    type: Boolean,
    required: false,
  },
});

const emit = defineEmits(["submit", "cancel"]);

const form = ref({ ...props.initialData });

const typeError = ref<string | undefined>(undefined);
const linkError = ref<string | undefined>(undefined);
const descriptionError = ref<string | undefined>(undefined);

const linkTypes = computed(() => [
  { value: "", text: "Sélectionner un type de lien" },
  ...Object.entries(linkTypesDict).map(([key, label]) => ({
    value: key,
    text: label,
  })),
]);

function handleSubmit() {
  typeError.value = form.value.type ? undefined : "Veuillez compléter le champ : Type de lien";
  linkError.value = form.value.link ? undefined : "Veuillez compléter le champ : URL";
  descriptionError.value = form.value.description ? undefined : "Veuillez compléter le champ : Description";
  if (typeError.value || linkError.value || descriptionError.value) return;

  emit("submit", form.value);
}
</script>

<template>
  <form data-testid="link-form" @submit.prevent="handleSubmit">
    <p class="fr-text--sm fr-mb-3w" data-testid="required-fields-hint">Tous les champs avec un * sont obligatoires</p>
    <DsfrSelect
      v-model="form.type"
      class="fr-mb-3w"
      :options="linkTypes"
      label="Type de lien"
      label-visible
      required
      :error-message="typeError"
      data-testid="link-type-select"
    />
    <DsfrInputGroup
      v-model="form.link"
      class="fr-mb-3w"
      label="URL"
      type="url"
      label-visible
      required
      :error-message="linkError"
      data-testid="link-url-input"
    />
    <DsfrInputGroup
      v-model="form.description"
      class="fr-mb-3w"
      label="Description"
      label-visible
      required
      is-textarea
      :error-message="descriptionError"
      data-testid="link-description-input"
    />

    <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
      <DsfrButton type="button" secondary label="Annuler" data-testid="link-cancel-btn" @click="$emit('cancel')" />
      <DsfrButton
        type="submit"
        :disabled="isSubmitting"
        :label="isSubmitting ? 'Enregistrement...' : 'Enregistrer'"
        data-testid="link-submit-btn"
      >
        <template v-if="isSubmitting">
          <span class="fr-loading fr-loading--sm" data-testid="link-submit-loading">
            <span class="fr-loading__icon" aria-hidden="true" />
          </span>
        </template>
      </DsfrButton>
    </div>
  </form>
</template>
