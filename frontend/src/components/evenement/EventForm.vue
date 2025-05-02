<script setup lang="ts">
import { ref } from "vue";
import type { Event } from "@/models/Application";
import { defineProps, defineEmits, computed } from "vue";
import type { PropType } from "vue";
import { eventTypesArray } from "@/composables/use-dictionary";

const props = defineProps({
  initialData: {
    type: Object as PropType<Event>,
    required: false,
  },
  isSubmitting: {
    type: Boolean,
    required: false,
  },
});

const eventTypes = computed(() => [{ value: "", text: "Choisir un type d'événement" }, ...eventTypesArray]);

const form = ref({ ...props.initialData });

const emit = defineEmits(["update:application", "submit"]);

const handleSubmit = () => {
  emit("submit", form.value);
};
</script>
<template>
  <form @submit.prevent="handleSubmit">
    <DsfrSelect class="fr-mb-3w" v-model="form.type" :options="eventTypes" label="Type de l'événement" required />
    <DsfrInput class="fr-mb-3w" v-model="form.start" label="Date de début" label-visible type="date" required />
    <DsfrInput class="fr-mb-3w" v-model="form.end" label="Date de fin" label-visible type="date" required />
    <DsfrInput class="fr-mb-3w" v-model="form.description" label="Description" label-visible is-textarea required />

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
