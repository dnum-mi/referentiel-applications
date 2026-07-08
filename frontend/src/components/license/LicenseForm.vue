<script setup lang="ts">
import type { LicenseDto } from "@/client/types.gen";
import type { PropType } from "vue";
import { computed, ref } from "vue";

const props = defineProps({
  initialData: Object as PropType<LicenseDto>,
  isSubmitting: Boolean,
});

const emit = defineEmits(["submit", "cancel"]);

// Identifiants SPDX les plus courants proposés en suggestion (saisie libre conservée).
const SPDX_SUGGESTIONS = [
  "MIT",
  "Apache-2.0",
  "GPL-2.0-only",
  "GPL-3.0-only",
  "LGPL-3.0-only",
  "AGPL-3.0-only",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "MPL-2.0",
  "EPL-2.0",
  "ISC",
  "Unlicense",
  "EUPL-1.2",
  "CeCILL-2.1",
];

const form = ref<{ name: string; version: string }>({
  name: props.initialData?.name ?? "",
  version: props.initialData?.version ?? "",
});

const isFormValid = computed(() => form.value.name.trim() !== "");

function handleSubmit() {
  emit("submit", {
    id: props.initialData?.id,
    name: form.value.name.trim(),
    version: form.value.version?.trim() || null,
  });
}
</script>

<template>
  <form data-testid="license-form" @submit.prevent="handleSubmit">
    <DsfrInput
      v-model="form.name"
      label="Licence"
      label-visible
      required
      list="spdx-license-suggestions"
      placeholder="ex : MIT, Apache-2.0"
      data-testid="license-name-input"
      class="fr-mb-1w"
    />
    <datalist id="spdx-license-suggestions">
      <option v-for="spdx in SPDX_SUGGESTIONS" :key="spdx" :value="spdx"></option>
    </datalist>
    <p class="fr-hint-text fr-mb-3w">Identifiant SPDX recommandé (saisie libre possible).</p>

    <DsfrInput
      v-model="form.version"
      label="Version"
      label-visible
      placeholder="ex : 2.0"
      data-testid="license-version-input"
      class="fr-mb-3w"
    />

    <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
      <DsfrButton type="button" secondary label="Annuler" data-testid="license-cancel-btn" @click="$emit('cancel')" />
      <DsfrButton
        type="submit"
        :disabled="isSubmitting || !isFormValid"
        :label="isSubmitting ? 'Enregistrement...' : 'Enregistrer'"
        data-testid="license-submit-btn"
      />
    </div>
  </form>
</template>
