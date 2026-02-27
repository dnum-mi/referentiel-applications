<script setup lang="ts">
import type { LabelDto } from "@/client/types.gen";

defineProps<{ labels: LabelDto[]; canEdit: boolean }>();
const emit = defineEmits(["edit", "delete"]);

function handleEdit(label: LabelDto) {
  emit("edit", label);
}

function handleDelete(label: LabelDto) {
  emit("delete", label);
}
</script>

<template>
  <div v-if="labels.length === 0" class="fr-text--sm fr-text--italic" data-testid="label-empty">Aucun nom alternatif.</div>
  <div v-else>
    <div v-for="label in labels" :key="label.id" class="fr-pb-1w fr-border--bottom" :data-testid="`label-item-${label.id}`">
      <div class="fr-grid-row fr-grid-row--middle">
        <div class="fr-col">
          <div class="fr-text--sm">
            <p v-if="label.value" class="fr-mb-0">
              {{ label.value }}
              <template v-if="label.labelSource?.source"> ({{ label.labelSource.source }}) </template>
            </p>
          </div>
        </div>
        <div class="fr-col-auto">
          <DsfrButton
            tertiary
            size="sm"
            icon="fr-icon-edit-line"
            title="Modifier"
            class="fr-mr-1w"
            data-testid="label-edit-btn"
            :disabled="!canEdit"
            @click="handleEdit(label)"
          />
          <DsfrButton
            tertiary
            size="sm"
            icon="fr-icon-delete-bin-line"
            title="Supprimer"
            data-testid="label-delete-btn"
            :disabled="!canEdit"
            @click="handleDelete(label)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
