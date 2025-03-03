<script setup lang="ts">
import { ref } from "vue";
import type { Event } from "@/models/Application";
import { defineProps, defineEmits } from "vue";

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

const eventTypesDict = {
  under_construction: "En construction",
  in_production: "En production",
  decommissioned: "Décommissioné",
  decommissioning: "En décomissionnement",
  highlight: "Évenement",
};

const eventTypes = computed(() => [
  { value: "", text: "Choisir un type d'événement" },
  ...Object.entries(eventTypesDict).map(([value, text]) => ({ value, text })),
]);

const form = ref({
  id: props.initialData?.id ?? "",
  start: props.initialData?.start ?? "",
  end: props.initialData?.end ?? "",
  type: props.initialData?.type ?? "",
  description: props.initialData?.description ?? "",
});

const emit = defineEmits(["update:application", "submit"]);

const handleSubmit = () => {
  emit("submit", form.value);
};
</script>
<template>
  <form @submit.prevent="handleSubmit">
    <div class="fr-input-group">
      <label class="fr-label" for="type">Type de l'événement</label>
      <DsfrSelect v-model="form.type" :options="eventTypes" />
    </div>

    <DsfrInput v-model="form.start" label="Date de début" label-visible type="date" class="fr-mb-1w" required />

    <DsfrInput v-model="form.end" label="Date de fin" label-visible type="date" class="fr-mb-1w" required />

    <DsfrInputGroup class="fr-mt-3w" label="description" v-model="form.description">
      <DsfrInput v-model="form.description" label="Description" label-visible is-textarea />
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
