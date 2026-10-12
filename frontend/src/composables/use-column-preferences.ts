import { useUserStore } from "@/stores/userStore";
import { AVAILABLE_COLUMNS, DEFAULT_VISIBLE_COLUMNS, type ColumnConfig } from "@/types/columns";
import type { TableColumn } from "@/types/table";
import { computed, ref, watch } from "vue";
import { DEFAULT_COLUMN_WIDTH, normalizeColumnWidth } from "@/utils/column-width";

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

    return false;
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
      width: `${getColumnWidth(col.field)}px`,
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
    const normalizedWidth = normalizeColumnWidth(width);
    if (!AVAILABLE_COLUMNS.some((column) => column.field === field) || normalizedWidth === undefined) return;
    columnWidths.value = {
      ...columnWidths.value,
      [field]: `${normalizedWidth}px`,
    };
  };

  const getColumnWidth = (field: string) =>
    normalizeColumnWidth(columnWidths.value[field]) ??
    normalizeColumnWidth(AVAILABLE_COLUMNS.find((column) => column.field === field)?.defaultWidth) ??
    DEFAULT_COLUMN_WIDTH;

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
    getColumnWidth,
    resetToDefaults,
    isColumnVisible: (field: string) => preferences.value.visibleColumns.includes(field),
  };
}
