<script setup lang="ts">
import { ref } from "vue";
import type { Link } from "@/core/application/dto/ApplicationDTO";
import { defineProps, defineEmits, computed, PropType } from "vue";
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

const linkTypes = computed(() => [
  { value: "", text: "choisir un type de lien" },
  ...Object.entries(linkTypesDict).map(([key, label]) => ({
    value: key,
    text: label,
  })),
]);

const form = ref({
  id: props.initialData?.id ?? "",
  type: props.initialData?.type ?? "",
  link: props.initialData?.link ?? "",
  description: props.initialData?.description ?? "",
});

const emit = defineEmits(["update:application", "submit", "cancel"]);

const handleSubmit = () => {
  emit("submit", form.value);
};
</script>
<template>
  <form @submit.prevent="handleSubmit">
    <div class="fr-input-group">
      <label class="fr-label" for="type">Type de lien</label>
      <DsfrSelect v-model="form.type" :options="linkTypes" />
    </div>

    <div class="fr-input-group fr-mt-3w">
      <label class="fr-label" for="url">URL</label>
      <input type="url" id="url" v-model="form.link" class="fr-input" required placeholder="https://" />
    </div>

    <DsfrInputGroup class="fr-mt-3w" label="Description" v-model="form.description" required>
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
