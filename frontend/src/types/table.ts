export interface TableColumn {
  field: string;
  header: string;
  sortable?: boolean;
  width?: string;
}

export interface RefAppTableProps<T = Record<string, any>> {
  items: T[];
  columns: TableColumn[];
  loading?: boolean;
  totalRecords?: number;
  sortField?: string;
  sortOrder?: number;
  lazy?: boolean;
  dataTestId?: string;
  emptyMessage?: string;
}

export interface PrimeVueSortEvent {
  sortField: string;
  sortOrder: number;
  originalEvent?: Event;
}

export interface TableSortEvent {
  sortField: string;
  sortOrder: number;
}
