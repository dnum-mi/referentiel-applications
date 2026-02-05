<script lang="ts" setup>
import { useNotesDialog } from "@/composables/issue/use-notes-dialog";
import { Textarea } from "primevue";

const props = defineProps<{
  notes: string;
  reportId: string;
  isEditing: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const { isOpen, openDialog, handleReset, submit, editedNotes, handleClose } = useNotesDialog(
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
      title="Editer la notes"
      aria-label="Editer la notes"
      style="gap: 0"
      @click="openDialog"
    />
  </div>

  <DsfrModal :opened="isOpen" title="Editer la note" data-testid="customize-columns-dialog" @close="handleClose">
    <Textarea v-model="editedNotes" rows="5" cols="30" />
    <template #footer>
      <DsfrButton label="Réinitialiser" secondary size="sm" @click="handleReset()" data-testid="reset-columns-button" />
      <DsfrButton label="Valider" size="sm" @click="submit(reportId)" data-testid="valid-dialog-button" />
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
