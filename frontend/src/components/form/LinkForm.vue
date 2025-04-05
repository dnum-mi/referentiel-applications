<script setup lang="ts">
import { ref, watch, computed, defineProps, defineEmits, PropType } from "vue";
import type { Link } from "@/core/application/dto/ApplicationDTO";
import { linkTypesDict } from "@/composables/use-dictionary";

const props = defineProps({
  initialData: {
    type: Object as PropType<Link>,
    required: false,
  },
  isSubmitting: {
    type: Boolean,
    required: false,
  },
});

const emit = defineEmits(["submit", "cancel"]);

const form = ref({
  id: "",
  type: "",
  link: "",
  description: "",
});

watch(
  () => props.initialData,
  (newVal) => {
    form.value = {
      id: newVal?.id ?? "",
      type: newVal?.type ?? "",
      link: newVal?.link ?? "",
      description: newVal?.description ?? "",
    };
  },
  { immediate: true },
);

const linkTypes = computed(() => [
  { value: "", text: "choisir un type de lien" },
  ...Object.entries(linkTypesDict).map(([key, label]) => ({
    value: key,
    text: label,
  })),
]);

const handleSubmit = () => {
  emit("submit", form.value);
};
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <div class="fr-input-group">
      <label class="fr-label" for="type">Type de lien</label>
      <DsfrSelect v-model="form.type" :options="linkTypes" required />
    </div>

    <div class="fr-input-group fr-mt-3w">
      <label class="fr-label" for="url">URL</label>
      <input type="url" id="url" v-model="form.link" class="fr-input" required placeholder="https://" />
    </div>

    <DsfrInputGroup class="fr-mt-3w" label="Description" required>
      <DsfrInput v-model="form.description" is-textarea required />
    </DsfrInputGroup>

    <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
      <DsfrButton secondary label="Annuler" @click="$emit('cancel')" />
      <DsfrButton type="submit" :disabled="isSubmitting" :label="isSubmitting ? 'Enregistrement...' : 'Enregistrer'">
        <template v-if="isSubmitting">
          <span class="fr-loading fr-loading--sm">
            <span class="fr-loading__icon" aria-hidden="true"></span>
          </span>
        </template>
      </DsfrButton>
    </div>
  </form>
</template>
