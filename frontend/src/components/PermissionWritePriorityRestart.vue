<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(defineProps<{
  checked: boolean
  id: string
}>(), {
});

const emit = defineEmits<{
  "update:model-value": [value: boolean]
}>();

const value = computed(() => props.checked ? "write" : "read");

const permDict = {
  read: {
    label: "RO",
    class: "permission-read",
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

.permission-read {
  background-color: var(--background-action-low-blue-cumulus);
}
.permission-read:hover {
  background-color: var(--background-action-low-blue-cumulus-hover);
}
.permission-read:active {
  background-color: var(--background-action-low-blue-cumulus-active);
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
</style>
