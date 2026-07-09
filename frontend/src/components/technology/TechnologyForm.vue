<script setup lang="ts">
import type { TechnologyDto } from "@/client/types.gen";
import type { PropType } from "vue";
import { computed, ref } from "vue";

const props = defineProps({
  initialData: Object as PropType<TechnologyDto>,
  isSubmitting: Boolean,
});

const emit = defineEmits(["submit", "cancel"]);

const form = ref<{ technology: string; version: string }>({
  technology: props.initialData?.technology ?? "",
  version: props.initialData?.version ?? "",
});

const isFormValid = computed(() => form.value.technology.trim() !== "");

function handleSubmit() {
  emit("submit", {
    id: props.initialData?.id,
    technology: form.value.technology.trim(),
    version: form.value.version?.trim() || null,
  });
}
</script>

<template>
  <form data-testid="technology-form" @submit.prevent="handleSubmit">
    <DsfrInput
      v-model="form.technology"
      label="Technologie"
      label-visible
      required
      placeholder="ex : Node.js, PostgreSQL"
      data-testid="technology-name-input"
      class="fr-mb-3w"
    />

    <DsfrInput
      v-model="form.version"
      label="Version"
      label-visible
      placeholder="ex : 20.11"
      data-testid="technology-version-input"
      class="fr-mb-3w"
    />

    <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
      <DsfrButton type="button" secondary label="Annuler" data-testid="technology-cancel-btn" @click="$emit('cancel')" />
      <DsfrButton
        type="submit"
        :disabled="isSubmitting || !isFormValid"
        :label="isSubmitting ? 'Enregistrement...' : 'Enregistrer'"
        data-testid="technology-submit-btn"
      />
    </div>
  </form>
</template>
