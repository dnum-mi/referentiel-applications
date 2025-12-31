<script setup lang="ts">
import { ref, computed } from "vue";
import type { PropType } from "vue";
import type { ApplicationStatusDto } from "@/client/types.gen";
import { statusApplicationDictionary } from "@/composables/use-dictionary";

const props = defineProps({
  initialData: {
    type: Object as PropType<Partial<ApplicationStatusDto>>,
    required: false,
  },
  isSubmitting: {
    type: Boolean,
    required: false,
  },
});

const emit = defineEmits(["submit", "cancel"]);

const form = ref({
  status: props.initialData?.status || "",
  statusDate: props.initialData?.statusDate ? new Date(props.initialData.statusDate).toISOString().split("T")[0] : "",
});

const statusOptions = computed(() => [
  { value: "", text: "Sélectionner un statut" },
  ...Object.entries(statusApplicationDictionary).map(([key, label]) => ({
    value: key,
    text: label,
  })),
]);

function handleSubmit() {
  emit("submit", form.value);
}
</script>

<template>
  <form data-testid="status-form" @submit.prevent="handleSubmit">
    <DsfrSelect
      v-model="form.status"
      class="fr-mb-3w"
      :options="statusOptions"
      label="Statut"
      label-visible
      required
      data-testid="status-select"
    />
    <DsfrInput
      v-model="form.statusDate"
      class="fr-mb-3w"
      label="Date du statut (optionnel)"
      label-visible
      type="date"
      hint="Date à laquelle le changement de statut a eu lieu"
      data-testid="status-date-input"
    />

    <div class="fr-btns-group fr-btns-group--inline-sm fr-mt-3w">
      <DsfrButton type="submit" :disabled="isSubmitting" data-testid="status-submit-btn">
        {{ isSubmitting ? "En cours..." : "Enregistrer" }}
      </DsfrButton>
      <DsfrButton secondary type="button" data-testid="status-cancel-btn" @click="emit('cancel')"> Annuler </DsfrButton>
    </div>
  </form>
</template>
