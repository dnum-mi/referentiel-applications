<script setup lang="ts">
import type { Permission } from "@/client";
import { PERMISSIONS_LABELS } from "@/utils/roles-utils";

const props = defineProps<{ permissions: Permission[]; label: string }>();
</script>

<template>
  <div class="fr-mb-3w">
    <p class="fr-text--sm fr-text--bold fr-mb-1w">{{ props.label }}</p>
    <div v-if="props.permissions.length" class="fr-tags-group">
      <div v-for="perm in props.permissions" :key="perm" class="fr-flex fr-align-items-center" style="gap: 0.25rem">
        <DsfrTag small class="fr-tag--dismiss" :label="PERMISSIONS_LABELS[perm]" />
      </div>
    </div>
    <span v-else class="fr-text--disabled">—</span>
  </div>
</template>
