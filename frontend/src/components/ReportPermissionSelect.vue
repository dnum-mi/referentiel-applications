<script setup lang="ts">
import { DsfrToggleSwitch } from "@gouvminint/vue-dsfr";

type ReportPermissionValue = "read" | "post" | "manage";
const props = defineProps<{
  read: boolean;
  post: boolean;
  manage: boolean;
  id: string;
}>();

const emits = defineEmits<{
  (e: "update:model-value", value: ReportPermissionValue[]): void;
}>();

const canManage = ref(props.manage);
const canRead = ref(props.read || canManage.value);
const canPost = ref(props.post || canManage.value);

function updateSelectedValues() {
  nextTick(() => {
    const selectedValues = [] as ReportPermissionValue[];
    if (canRead.value || canManage.value) {
      selectedValues.push("read");
    }
    if (canPost.value || canManage.value) {
      selectedValues.push("post");
    }
    if (canManage.value) {
      selectedValues.push("manage");
    }
    emits("update:model-value", selectedValues);
  });
}
</script>

<template>
  <div class="report-permission-select" data-testid="report-permission-select">
    <DsfrToggleSwitch
      v-model="canRead"
      label="Lecture"
      no-text
      :disabled="canManage"
      data-testid="report-permission-read"
      @update:model-value="updateSelectedValues"
    />
    <DsfrToggleSwitch
      v-model="canPost"
      label="Publication"
      no-text
      :disabled="canManage"
      data-testid="report-permission-post"
      @update:model-value="updateSelectedValues"
    />
    <DsfrToggleSwitch
      v-model="canManage"
      label="Gestion"
      no-text
      data-testid="report-permission-manage"
      @update:model-value="updateSelectedValues"
    />
  </div>
</template>

<style scoped>
.report-permission-select {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
