<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    checked: boolean;
    id: string;
  }>(),
  {},
);

const emit = defineEmits<{
  "update:model-value": [value: boolean];
}>();

const value = computed(() => (props.checked ? "write" : "none"));

const permDict = {
  none: {
    label: "-",
    class: "permission-none",
  },
  write: {
    label: "RW",
    class: "permission-write",
  },
};
</script>

<template>
  <!-- Assign class for feedback when clicked -->
  <DsfrButton
    class="toggle-permission"
    tertiary
    small
    :class="permDict[value].class ?? 'permission-error'"
    data-testid="permission-toggle"
    @click="emit('update:model-value', !checked)"
  >
    {{ permDict[value].label ?? "?" }}
  </DsfrButton>
</template>

<style scoped>
.fr-fieldset__element {
  margin-bottom: 0.5rem !important;
}

.toggle-permission {
  width: 3.7rem;
  color: var(--text-action-high-grey);
}

.permission-write {
  background-color: var(--background-action-low-green-emeraude);
}
.permission-write:hover {
  background-color: var(--background-action-low-green-emeraude-hover);
}
.permission-write:active {
  background-color: var(--background-action-low-green-emeraude-active);
}

.permission-none {
  background-color: var(--background-action-low-red-marianne);
}
.permission-none:hover {
  background-color: var(--background-action-low-red-marianne-hover);
}
.permission-none:active {
  background-color: var(--background-active-red-marianne-hover);
}
</style>
