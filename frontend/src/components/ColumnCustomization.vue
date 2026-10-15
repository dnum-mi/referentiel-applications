<script setup lang="ts">
import { ref, computed, useId } from "vue";
import { useColumnPreferences } from "@/composables/use-column-preferences";
import { MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH } from "@/utils/column-width";

const { availableColumns, visibleColumnFields, setVisibleColumns, setColumnWidth, getColumnWidth, resetToDefaults } =
  useColumnPreferences();
const widthControlId = `column-width-${useId()}`;
const widthStatus = ref("");

const visible = ref(false);

const selectedColumns = ref<string[]>([]);

const showDialog = () => {
  selectedColumns.value = [...visibleColumnFields.value];
  widthStatus.value = "";
  visible.value = true;
};

const hideDialog = () => {
  visible.value = false;
};

const handleReset = () => {
  resetToDefaults();
  selectedColumns.value = [...visibleColumnFields.value];
  widthStatus.value = "La présentation des colonnes a été réinitialisée.";
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

const widthColumns = computed(() => availableColumns.value.filter((column) => selectedColumns.value.includes(column.field)));

function handleWidthChange(field: string, header: string, event: Event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (!input.checkValidity()) {
    input.reportValidity();
    return;
  }
  setColumnWidth(field, `${input.value}px`);
  widthStatus.value = `La largeur de la colonne ${header} est maintenant de ${getColumnWidth(field)} pixels.`;
}

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

      <fieldset v-if="widthColumns.length" class="fr-fieldset fr-mt-3w">
        <legend class="fr-fieldset__legend">Largeur des colonnes</legend>
        <p :id="`${widthControlId}-help`" class="fr-hint-text">
          Choisissez une largeur entre {{ MIN_COLUMN_WIDTH }} et {{ MAX_COLUMN_WIDTH }} pixels. Les réglages sont enregistrés sur cet
          appareil.
        </p>
        <div v-for="column in widthColumns" :key="column.field" class="fr-input-group column-width-input">
          <label class="fr-label" :for="`${widthControlId}-${column.field}`">{{ column.header }} — largeur en pixels</label>
          <input
            :id="`${widthControlId}-${column.field}`"
            class="fr-input"
            type="number"
            required
            :min="MIN_COLUMN_WIDTH"
            :max="MAX_COLUMN_WIDTH"
            step="1"
            :value="getColumnWidth(column.field)"
            :aria-describedby="`${widthControlId}-help`"
            @change="handleWidthChange(column.field, column.header, $event)"
          />
        </div>
      </fieldset>
      <p role="status" class="fr-sr-only">{{ widthStatus }}</p>

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

.column-width-input {
  width: 100%;
}

.description {
  margin-bottom: 1.5rem;
  color: var(--text-mention-grey);
}
</style>
