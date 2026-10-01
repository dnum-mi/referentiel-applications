<script setup lang="ts">
type PermissionValue = "none" | "Read" | "Write";

const props = withDefaults(
  defineProps<{
    read?: boolean;
    write?: boolean;
    id: string;
    permOrder?: PermissionValue[];
  }>(),
  {
    permOrder: () => ["none", "Read", "Write"] as PermissionValue[],
  },
);

const emit = defineEmits<{
  (e: "update:model-value", value: PermissionValue): void;
}>();

const permDict = {
  none: {
    label: "-",
    text: "Aucun droit (-)",
    class: "permission-none",
  },
  Read: {
    label: "RO",
    text: "Lecture seule (RO)",
    class: "permission-Read",
  },
  Write: {
    label: "RW",
    text: "Lecture et écriture (RW)",
    class: "permission-Write",
  },
};
const permOrder = props.permOrder;

const permIndex = ref(0);

// Conserve les clics optimistes tout en suivant les permissions rechargées par le parent.
watch(
  [() => props.read, () => props.write],
  ([read, write]) => {
    const currentPermission = write ? "Write" : read ? "Read" : "none";
    const foundIndex = permOrder.indexOf(currentPermission);
    permIndex.value = foundIndex === -1 ? 0 : foundIndex;
  },
  { immediate: true },
);

const toggleTitle = computed(() => {
  const current = permDict[permOrder[permIndex.value]];
  const nextIndex = permIndex.value >= permOrder.length - 1 ? 0 : permIndex.value + 1;
  const next = permDict[permOrder[nextIndex]];
  return `Sélection actuelle : ${current.text}, après activation : ${next.text}`;
});

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
    :title="toggleTitle"
    :aria-label="toggleTitle"
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

.permission-Read {
  background-color: var(--background-action-low-blue-cumulus);
}
.permission-Read:hover {
  background-color: var(--background-action-low-blue-cumulus-hover);
}
.permission-Read:active {
  background-color: var(--background-action-low-blue-cumulus-active);
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
</style>
