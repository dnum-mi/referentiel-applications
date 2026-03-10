<script setup lang="ts">
type PermissionValue = "none" | "read" | "write";

const props = withDefaults(
  defineProps<{
    read?: boolean;
    write?: boolean;
    id: string;
    permOrder?: PermissionValue[];
  }>(),
  {
    permOrder: () => ["none", "read", "write"] as PermissionValue[],
  },
);

const emit = defineEmits<{
  (e: "update:model-value", value: PermissionValue): void;
}>();

const permDict = {
  none: {
    label: "-",
    class: "permission-none",
  },
  read: {
    label: "RO",
    class: "permission-read",
  },
  write: {
    label: "RW",
    class: "permission-write",
  },
};
const permOrder = props.permOrder;

const foundIndex = permOrder.findIndex((option) => option === (props.write ? "write" : props.read ? "read" : "none"));
const permIndex = ref(foundIndex === -1 ? 0 : foundIndex);

function togglePermission() {
  if (permIndex.value >= permOrder.length - 1) {
    permIndex.value = 0; // Reset to "read" if minimum read is required
  } else {
    permIndex.value++;
  }
  emit("update:model-value", permOrder[permIndex.value]);
}
</script>

<template>
  <!-- Assign class for feedback when clicked -->
  <DsfrButton
    class="toggle-permission"
    tertiary
    small
    :class="permDict[permOrder[permIndex]].class ?? 'permission-error'"
    data-testid="permission-toggle"
    :data-state="permOrder[permIndex]"
    @click="togglePermission"
  >
    {{ permDict[permOrder[permIndex]].label ?? "?" }}
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

.permission-none {
  background-color: var(--background-action-low-red-marianne);
}
.permission-none:hover {
  background-color: var(--background-action-low-red-marianne-hover);
}
.permission-none:active {
  background-color: var(--background-active-red-marianne-hover);
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
