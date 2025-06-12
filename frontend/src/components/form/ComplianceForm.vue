<script setup lang="ts">
import { ref } from "vue";
import type { Compliance } from "@/models/Application";
import { defineProps, defineEmits, computed } from "vue";
import type { PropType } from "vue";
import { complianceTypesDict, complianceStatusesDict } from "@/composables/use-dictionary";

const props = defineProps({
  initialData: {
    type: Object as PropType<Compliance>,
    required: false,
  },
  isSubmitting: {
    type: Boolean,
    required: false,
  },
});

const complianceTypes = computed(() => [
  { value: "", text: "Choisir un type de conformité" },
  ...Object.entries(complianceTypesDict).map(([value, text]) => ({ value, text })),
]);

const complianceStatuses = computed(() => [
  { value: "", text: "Choisir un statut" },
  ...Object.entries(complianceStatusesDict).map(([value, text]) => ({ value, text })),
]);

const form = ref({
  ...props.initialData,
  validityStart: props.initialData?.validityStart?.split("T")[0] || undefined,
  validityEnd: props.initialData?.validityEnd?.split("T")[0] || undefined,
});

const emit = defineEmits(["update:application", "submit", "cancel"]);

const handleSubmit = () => {
  emit("submit", form.value);
};
</script>
<template>
  <form @submit.prevent="handleSubmit">
    <DsfrInput class="fr-mb-3w" v-model="form.name" label="Nom de la conformité" label-visible required />
    <DsfrSelect class="fr-mb-3w" v-model="form.type" :options="complianceTypes" label="Type de conformité" label-visible required />
    <DsfrSelect
      class="fr-mb-3w"
      v-model="form.status"
      :options="complianceStatuses"
      label="Statut de la conformité"
      label-visible
      required
    />
    <DsfrInput class="fr-mb-3w" v-model="form.validityStart" label="Date de début" type="date" label-visible />
    <DsfrInput class="fr-mb-3w" v-model="form.validityEnd" label="Date de fin" type="date" label-visible />
    <DsfrInput class="fr-mb-3w" v-model="form.scoreValue" placeholder="Score" label="Score" label-visible />
    <DsfrInput class="fr-mb-3w" v-model="form.scoreUnit" placeholder="Unité" label="Unité" label-visible />
    <DsfrInput class="fr-mb-3w" v-model="form.notes" is-textarea label="Notes" label-visible />

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
