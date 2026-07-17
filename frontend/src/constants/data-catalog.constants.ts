import type { OpenDataStatus, UpdateFrequency } from "@/client/types.gen.js";
import type { TableColumn } from "@/types/table";

export const OPEN_DATA_STATUS_LABELS = {
  EXPOSED: "Exposé",
  NOT_EXPOSED: "Exposable",
  NOT_EXPOSABLE: "Non exposable",
} as const satisfies Record<OpenDataStatus, string>;

export const UPDATE_FREQUENCY_LABELS = {
  DAILY: "Quotidienne",
  WEEKLY: "Hebdomadaire",
  MONTHLY: "Mensuelle",
  YEARLY: "Annuelle",
  ON_DEMAND: "À la demande",
} as const satisfies Record<UpdateFrequency, string>;

export const OPEN_DATA_BADGE_CLASS = {
  EXPOSED: "fr-badge--success",
  NOT_EXPOSED: "fr-badge--warning",
  NOT_EXPOSABLE: "fr-badge--error",
} as const satisfies Record<OpenDataStatus, string>;

export const DOCUMENTATION_COLUMNS: TableColumn[] = [{ field: "url", header: "Lien", sortable: false }];

export const EXPOSURE_COLUMNS: TableColumn[] = [
  { field: "type", header: "Type", sortable: false },
  { field: "format", header: "Format", sortable: false },
  { field: "endpoint", header: "Point de terminaison / URL", sortable: false },
  { field: "authenticationType", header: "Authentification", sortable: false },
];
