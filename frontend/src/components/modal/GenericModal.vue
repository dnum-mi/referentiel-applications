<script setup lang="ts">
import { computed, defineProps, defineEmits } from "vue";

const props = defineProps({
  opened: Boolean,
  title: String,
  formComponent: Object,
  formProps: Object,
  isSubmitting: Boolean,
});

const emit = defineEmits(["submit", "cancel"]);
const modalTitle = computed(() => props.title);

function submit(data) {
  emit("submit", data);
}
function cancel() {
  emit("cancel");
}
</script>

<template>
  <DsfrModal :opened="props.opened" :title="modalTitle" size="lg" @close="cancel">
    <component :is="props.formComponent" v-bind="props.formProps" :is-submitting="props.isSubmitting" @submit="submit" @cancel="cancel" />
  </DsfrModal>
</template>
