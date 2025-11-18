<script setup lang="ts">
import ApplicationForm from "@/components/form/ApplicationForm.vue";

interface Props {
  opened: boolean
}

defineProps<Props>();
const emit = defineEmits<{
  close: []
}>();
</script>

<template>
  <DsfrModal
    size="lg"
    :opened="opened"
    title="Créer une application"
    data-testid="create-application-modal"
    @close="emit('close');"
  >
    <ApplicationForm
      mode="create"
      data-testid="create-application-form"
      @success="emit('close')"
      @cancel="emit('close')"
    />
  </DsfrModal>
</template>
