<script setup lang="ts">
import { ref } from "vue";
import type { Compliance } from "@/models/Application";
import { defineProps, defineEmits } from "vue";

const props = defineProps({
  application: {
    type: Object,
    required: true,
  },
  title: {
    type: String,
    default: "",
  },
  icon: {
    type: String,
    default: "",
  },
  initialData: {
    type: Object as PropType<Compliance>,
    required: false,
  },
  isSubmitting: {
    type: Boolean,
    required: false,
  },
});

const complianceTypesDict = {
  regulation: "Réglementation",
  standard: "Standard",
  policy: "Politique",
  contractual: "Contractuel",
  security: "Sécurité",
  privacy: "Confidentialité",
};

const complianceStatusesDict = {
  compliant: "Conforme",
  non_compliant: "Non conforme",
  partially_compliant: "Partiellement conforme",
  not_concerned: "Non concerné",
};

const complianceTypes = computed(() => [
  { value: "", text: "Choisir un type de conformité" },
  ...Object.entries(complianceTypesDict).map(([value, text]) => ({ value, text })),
]);

const complianceStatuses = computed(() => [
  { value: "", text: "Choisir un statut" },
  ...Object.entries(complianceStatusesDict).map(([value, text]) => ({ value, text })),
]);

const form = ref({
  id: props.initialData?.id ?? "",
  type: props.initialData?.type ?? "",
  name: props.initialData?.name ?? "",
  status: props.initialData?.status ?? "",
  validityStart: props.initialData?.validityStart ?? "",
  validityEnd: props.initialData?.validityEnd ?? "",
  scoreValue: props.initialData?.scoreValue ?? "",
  scoreUnit: props.initialData?.scoreUnit ?? "",
  notes: props.initialData?.notes ?? "",
});

const emit = defineEmits(["update:application", "submit"]);

const handleSubmit = () => {
  emit("submit", form.value);
};
</script>
<template>
  <form @submit.prevent="handleSubmit">
    <DsfrInputGroup class="fr-mt-3w" label="nom" v-model="form.name" required>
      <DsfrInput v-model="form.name" placeholder="Nom de la conformité" required />
    </DsfrInputGroup>

    <div class="fr-input-group">
      <label class="fr-label" for="type">Type de conformité</label>
      <DsfrSelect v-model="form.type" :options="complianceTypes" />
    </div>

    <div class="fr-input-group">
      <label class="fr-label" for="type">Statut de la conformité</label>
      <DsfrSelect v-model="form.status" :options="complianceStatuses" />
    </div>

    <DsfrInputGroup class="fr-mt-3w" label="Date de début" v-model="form.validityStart" required>
      <AppDate v-model="form.validityStart" label="Date de début" />
    </DsfrInputGroup>

    <DsfrInputGroup class="fr-mt-3w" label="Date de fin" v-model="form.validityEnd" required>
      <AppDate v-model="form.validityEnd" label="Date de fin" />
    </DsfrInputGroup>

    <DsfrInputGroup class="fr-mt-3w" label="Score" v-model="form.scoreValue" required>
      <DsfrInput v-model="form.scoreValue" placeholder="Score" />
    </DsfrInputGroup>
    <DsfrInputGroup class="fr-mt-3w" label="Unité" v-model="form.scoreUnit" required>
      <DsfrInput v-model="form.scoreUnit" placeholder="Unité" />
    </DsfrInputGroup>

    <DsfrInputGroup class="fr-mt-3w" label="notes" v-model="form.notes" required>
      <DsfrInput v-model="form.notes" is-textarea required />
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
