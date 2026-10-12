<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    checked: boolean;
    id: string;
    actorTypeLabel?: string;
  }>(),
  {},
);

const emit = defineEmits<{
  "update:model-value": [value: boolean];
}>();

const value = computed(() => (props.checked ? "write" : "none"));
const permissionLabel = computed(
  () =>
    `${permDict[value.value].label} — Écriture de la priorisation et du redémarrage${props.actorTypeLabel ? ` pour ${props.actorTypeLabel}` : ""}`,
);

const permDict = {
  none: {
    label: "-",
    class: "permission-none",
  },
  write: {
    label: "RW",
    class: "permission-Write",
  },
};
</script>

<template>
  <!-- Assign class for feedback when clicked -->
  <DsfrButton
    :id="id"
    class="toggle-permission"
    tertiary
    small
    :class="permDict[value].class ?? 'permission-error'"
    :aria-label="permissionLabel"
    :aria-pressed="checked"
    :title="
      checked
        ? 'Retirer le droit d’écriture de la priorisation et du redémarrage'
        : 'Accorder le droit d’écriture de la priorisation et du redémarrage'
    "
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

.permission-Write {
  background-color: var(--background-action-low-green-emeraude);
}
.permission-Write:hover {
  background-color: var(--background-action-low-green-emeraude-hover);
}
.permission-Write:active {
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
