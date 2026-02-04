<script lang="ts" setup>
import { useDescriptionDialog } from "@/composables/issue/use-description-dialog";
import { Textarea } from "primevue";

const props = defineProps<{
  description: string;
  reportId: string;
  isEditing: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const { isOpen, openDialog, handleReset, submit, editedDescription, handleClose } = useDescriptionDialog(
  () => props.description,
  () => emit("refresh"),
);
</script>
<template>
  <div class="container">
    {{ description }}
    <DsfrButton
      v-if="isEditing"
      icon="ri-edit-line"
      data-testid="actor-edit-description"
      title="Editer la description"
      aria-label="Editer la description"
      style="gap: 0"
      @click="openDialog"
    />
  </div>

  <DsfrModal :opened="isOpen" title="Editer la description" data-testid="customize-columns-dialog" @close="handleClose">
    <Textarea v-model="editedDescription" rows="5" cols="30" />
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
  justify-content: space-between;
  gap: 15px;
}
</style>
