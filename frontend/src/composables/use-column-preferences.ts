import { useUserStore } from "@/stores/userStore";
import { AVAILABLE_COLUMNS, DEFAULT_VISIBLE_COLUMNS, type ColumnConfig } from "@/types/columns";
import type { TableColumn } from "@/types/table";
import { computed, ref, watch } from "vue";

const STORAGE_KEY = "app-table-column-preferences";

interface ColumnPreferences {
  visibleColumns: string[];
  columnWidths?: Record<string, string>;
}

const loadPreferences = (): ColumnPreferences => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        visibleColumns: parsed.visibleColumns || DEFAULT_VISIBLE_COLUMNS,
        columnWidths: parsed.columnWidths || {},
      };
    }
  } catch (error) {
    console.error("Failed to load column preferences:", error);
  }
  return {
    visibleColumns: DEFAULT_VISIBLE_COLUMNS,
    columnWidths: {},
  };
};

const preferences = ref<ColumnPreferences>(loadPreferences());
const columnWidths = ref<Record<string, string>>(preferences.value.columnWidths || {});

const savePreferences = () => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        visibleColumns: preferences.value.visibleColumns,
        columnWidths: columnWidths.value,
      }),
    );
  } catch (error) {
    console.error("Failed to save column preferences:", error);
  }
};

watch([() => preferences.value.visibleColumns, columnWidths], savePreferences, { deep: true });

export function useColumnPreferences() {
  const userStore = useUserStore();

  const isColumnAvailable = (column: ColumnConfig): boolean => {
    if (column.alwaysAvailable) {
      return true;
    }
    if (userStore.hasPermissions(column.requiredPermissions ?? [])) {
      return !!userStore.authenticated;
    }

    return true;
  };

  const availableColumns = computed(() => {
    return AVAILABLE_COLUMNS.filter((col) => isColumnAvailable(col));
  });

  const visibleColumns = computed(() => {
    return availableColumns.value.filter((col) => preferences.value.visibleColumns.includes(col.field));
  });

  const visibleColumnFields = computed(() => {
    return preferences.value.visibleColumns;
  });

  const tableColumns = computed((): TableColumn[] => {
    return visibleColumns.value.map((col) => ({
      field: col.field,
      header: col.header,
      sortable: col.sortable,
      width: columnWidths.value[col.field] || col.defaultWidth,
    }));
  });

  const toggleColumn = (field: string) => {
    const index = preferences.value.visibleColumns.indexOf(field);
    const newVisibleColumns =
      index > -1 ? preferences.value.visibleColumns.filter((f) => f !== field) : [...preferences.value.visibleColumns, field];

    preferences.value = {
      ...preferences.value,
      visibleColumns: newVisibleColumns,
    };
  };

  const setVisibleColumns = (fields: string[]) => {
    preferences.value = {
      ...preferences.value,
      visibleColumns: [...fields],
    };
  };

  const setColumnWidth = (field: string, width: string) => {
    columnWidths.value = {
      ...columnWidths.value,
      [field]: width,
    };
  };

  const resetToDefaults = () => {
    preferences.value = {
      visibleColumns: DEFAULT_VISIBLE_COLUMNS,
      columnWidths: {},
    };
    columnWidths.value = {};
  };

  return {
    availableColumns,
    visibleColumns,
    visibleColumnFields,
    tableColumns,
    toggleColumn,
    setVisibleColumns,
    setColumnWidth,
    resetToDefaults,
    isColumnVisible: (field: string) => preferences.value.visibleColumns.includes(field),
  };
}
