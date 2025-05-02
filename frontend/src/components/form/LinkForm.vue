<script setup lang="ts">
import { ref, computed, defineProps, defineEmits } from "vue";
import type { PropType } from "vue";
import type { ExternalRessource } from "@/models/Application";
import { linkTypesDict } from "@/composables/use-dictionary";

const props = defineProps({
  initialData: {
    type: Object as PropType<ExternalRessource>,
    required: false,
  },
  isSubmitting: {
    type: Boolean,
    required: false,
  },
});

const emit = defineEmits(["submit", "cancel"]);

const form = ref({ ...props.initialData });

const linkTypes = computed(() => [
  { value: "", text: "Sélectionner un type de lien" },
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
    <DsfrSelect class="fr-mb-3w" v-model="form.type" :options="linkTypes" label="Type de lien" label-visible required />
    <DsfrInput class="fr-mb-3w" v-model="form.link" label="URL" type="url" label-visible required></DsfrInput>
    <DsfrInput class="fr-mb-3w" v-model="form.description" label="Description" label-visible required is-textarea></DsfrInput>

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
