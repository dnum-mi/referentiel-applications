<script lang="ts" setup>
import { useNotesDialog } from "@/composables/report/use-notes-dialog";
import { Textarea } from "primevue";
import { computed } from "vue";

const props = defineProps<{
  notes: string;
  reportId: string;
  reportDescription?: string;
  isEditing: boolean;
}>();

const reportContext = computed(() => props.reportDescription || props.reportId);
const noteInputId = computed(() => `report-note-${props.reportId}`);

const emit = defineEmits<{
  refresh: [];
}>();

const { isOpen, openDialog, handleReset, submit, editedNotes, handleClose, isSubmitting, submissionError } = useNotesDialog(
  () => props.notes,
  () => emit("refresh"),
);
</script>
<template>
  <div class="container" :style="isEditing ? 'justify-content: flex-end;' : 'justify-content: center;'">
    {{ notes }}
    <DsfrButton
      v-if="isEditing"
      icon="ri-edit-line"
      data-testid="actor-edit-notes"
      :title="`Modifier la note du signalement : ${reportContext}`"
      :aria-label="`Modifier la note du signalement : ${reportContext}`"
      style="gap: 0"
      @click="openDialog"
    />
  </div>

  <DsfrModal :opened="isOpen" title="Modifier la note du signalement" data-testid="customize-columns-dialog" @close="handleClose">
    <template v-if="isOpen">
      <div role="alert" aria-live="assertive" aria-atomic="true" data-testid="report-note-error">
        <p v-if="submissionError" class="fr-error-text">{{ submissionError }}</p>
      </div>
      <label :for="noteInputId" class="fr-label">Note du signalement : {{ reportContext }}</label>
      <Textarea :id="noteInputId" v-model="editedNotes" :disabled="isSubmitting" rows="5" cols="30" />
    </template>
    <template #footer>
      <template v-if="isOpen">
        <DsfrButton
          label="Réinitialiser"
          :disabled="isSubmitting"
          secondary
          size="sm"
          @click="handleReset()"
          data-testid="reset-columns-button"
        />
        <DsfrButton
          label="Valider"
          :disabled="isSubmitting"
          :aria-busy="isSubmitting"
          size="sm"
          @click="submit(reportId)"
          data-testid="valid-dialog-button"
        />
      </template>
    </template>
  </DsfrModal>
</template>

<style scoped>
.container {
  display: flex;
  align-items: center;
  gap: 15px;
}
</style>
