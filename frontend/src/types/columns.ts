import type { APP_PERMISSIONS } from "@/models/Application";

export interface ColumnConfig {
  field: string;
  header: string;
  sortable?: boolean;
  defaultWidth?: string;
  visible?: boolean;
  requiredPermissions?: APP_PERMISSIONS[];
  alwaysAvailable?: boolean;
}

export const AVAILABLE_COLUMNS: ColumnConfig[] = [
  {
    field: "quality",
    header: "IQ",
    sortable: true,
    defaultWidth: "80px",
    visible: true,
    alwaysAvailable: true,
  },
  {
    field: "label",
    header: "Nom",
    sortable: true,
    defaultWidth: "300px",
    visible: true,
    alwaysAvailable: true,
  },
  {
    field: "priorityRestart",
    header: "Priorité",
    sortable: true,
    defaultWidth: "160px",
    visible: true,
    alwaysAvailable: true,
  },
  {
    field: "hostingDisplay",
    header: "Hébergement",
    sortable: true,
    defaultWidth: "280px",
    visible: true,
    requiredPermissions: ["readHostings"],
  },
  {
    field: "tag",
    header: "Tags",
    sortable: true,
    defaultWidth: "240px",
    visible: true,
    alwaysAvailable: true,
  },
  {
    field: "moa",
    header: "MOA",
    sortable: false,
    defaultWidth: "200px",
    visible: false,
    requiredPermissions: ["readActors"],
  },
  {
    field: "moe",
    header: "MOE",
    sortable: false,
    defaultWidth: "200px",
    visible: false,
    requiredPermissions: ["readActors"],
  },
  {
    field: "hostingManagerDisplay",
    header: "Responsable hébergement",
    sortable: false,
    defaultWidth: "200px",
    visible: false,
    requiredPermissions: ["readActors"],
  },
  {
    field: "rsimm",
    header: "RSIMM",
    sortable: false,
    defaultWidth: "200px",
    visible: false,
    requiredPermissions: ["readActors"],
  },
  {
    field: "dima",
    header: "DIMA",
    sortable: false,
    defaultWidth: "150px",
    visible: false,
    requiredPermissions: ["readCompliances"],
  },
  {
    field: "pdma",
    header: "PDMA",
    sortable: false,
    defaultWidth: "150px",
    visible: false,
    requiredPermissions: ["readCompliances"],
  },
  {
    field: "rgaa",
    header: "RGAA",
    sortable: false,
    defaultWidth: "150px",
    visible: false,
    requiredPermissions: ["readCompliances"],
  },
  {
    field: "dsfr",
    header: "DSFR",
    sortable: false,
    defaultWidth: "150px",
    visible: false,
    requiredPermissions: ["readCompliances"],
  },
  {
    field: "homologation",
    header: "Homologation",
    sortable: false,
    defaultWidth: "180px",
    visible: false,
    requiredPermissions: ["readCompliances"],
  },
  {
    field: "status",
    header: "Status",
    sortable: false,
    defaultWidth: "150px",
    visible: false,
    alwaysAvailable: true,
  },
];

export const DEFAULT_VISIBLE_COLUMNS = AVAILABLE_COLUMNS.filter((col) => col.visible).map((col) => col.field);
