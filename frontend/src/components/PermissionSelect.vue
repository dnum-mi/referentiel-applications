<script setup lang="ts">
import { defineProps, computed } from "vue";

const props = defineProps<{
  read: boolean
  write: boolean
  readMinimum: boolean
  id: string
}>();

defineEmits<{
  (e: "update:model-value", value: (typeof options)[number]["value"]): void
}>();

const options = [
  {
    text: "Rien",
    value: "none",
    selected: !props.read && !props.write,
    disabled: props.readMinimum, // Disable if minimum read permission is required
  },
  {
    text: "Lecture",
    value: "read",
    selected: props.read && !props.write,
    disabled: false,
  },
  {
    text: "Écriture",
    value: "write",
    selected: props.write,
    disabled: false,
  },
];

const computedValue = computed(() => {
  if (props.write) return "write";
  if (props.read) return "read";
  return "none";
});
</script>

<template>
  <DsfrSelect
    :options="options"
    :select-id="`select-${id}`"
    :model-value="computedValue"
    @update:model-value="$emit('update:model-value', $event as (typeof options)[number]['value'])"
  />
</template>
