<script setup lang="ts">
import { ref, computed } from "vue";
import { useColumnPreferences } from "@/composables/use-column-preferences";

const { availableColumns, visibleColumnFields, setVisibleColumns, resetToDefaults } = useColumnPreferences();

const visible = ref(false);

const selectedColumns = ref<string[]>([]);

const showDialog = () => {
  selectedColumns.value = [...visibleColumnFields.value];
  visible.value = true;
};

const hideDialog = () => {
  visible.value = false;
};

const handleReset = () => {
  resetToDefaults();
  selectedColumns.value = [...visibleColumnFields.value];
};

const columnOptions = computed(() =>
  availableColumns.value.map((col) => ({
    label: col.header,
    value: col.field,
    name: `column-${col.field}`,
  })),
);

const handleColumnChange = (value: string[]) => {
  setVisibleColumns(value);
};

defineExpose({ showDialog });
</script>

<template>
  <div class="column-customization">
    <DsfrButton
      label="Personnaliser les colonnes"
      icon="ri-settings-3-line"
      size="sm"
      secondary
      @click="showDialog"
      data-testid="customize-columns-button"
    />

    <DsfrModal :opened="visible" title="Personnaliser les colonnes" data-testid="customize-columns-dialog" @close="hideDialog">
      <DsfrCheckboxSet
        v-model="selectedColumns"
        legend="Sélectionnez les colonnes à afficher dans le tableau :"
        :options="columnOptions"
        name="column-selection"
        data-testid="column-selection-checkboxes"
        @update:model-value="handleColumnChange"
      />

      <template #footer>
        <DsfrButton label="Réinitialiser" secondary size="sm" @click="handleReset" data-testid="reset-columns-button" />
        <DsfrButton label="Fermer" size="sm" @click="hideDialog" data-testid="close-dialog-button" />
      </template>
    </DsfrModal>
  </div>
</template>

<style scoped>
.column-customization {
  display: inline-block;
}

.description {
  margin-bottom: 1.5rem;
  color: var(--text-mention-grey);
}
</style>
