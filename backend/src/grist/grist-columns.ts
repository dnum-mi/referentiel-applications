import { ApplicationStatusLabels } from "src/applications/constants/enum-label";
import { ApplicationRepository } from "src/applications/infrastructure/repository/application.repository";

/// Ligne de la page de recherche, telle que la charge la synchronisation.
export type GristApplication = Awaited<
  ReturnType<ApplicationRepository["findSearchItems"]>
>[number];
type Actor = GristApplication["actors"][number];

export type GristColumnDefinition = {
  /// Champ de la colonne dans la page de recherche (frontend/src/types/columns.ts).
  field: string;
  /// Identifiant de la colonne dans Grist.
  colId: string;
  /// En-tête de la colonne dans la page.
  label: string;
  type: "Text" | "Numeric";
  /// Colonne réservée aux détenteurs de ColumnRead, comme dans la page.
  restricted: boolean;
  /// Valeur affichée dans la page (ApplicationTableView.vue).
  value: (app: GristApplication) => string | number | null;
};

/// Libellés courts des priorités, comme les badges de la page (restartPrioritiesConfig).
const PRIORITY_SHORT_LABELS: Record<string, string> = {
  R0: "R0",
  R1: "R1",
  R1_STAR: "R1*",
  R2: "R2",
  R3: "R3",
};

/// Comme homologationStatusDict (frontend/src/constants/dictionary.ts).
const HOMOLOGATION_LABELS: Record<string, string> = {
  homologuee: "Homologuée",
  en_cours: "En cours d'homologation",
  dispensee: "Dispensée d'homologation",
  non_realisee: "Non réalisée",
  a_mettre_en_place: "À mettre en place",
};

const DATE_FR = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Paris",
});

/// Acteurs d'un type, un par ligne : organisation, sinon nom, sinon e-mail, suivi de l'e-mail.
export function formatActors(actors: Actor[], actorTypeCode: string): string {
  return actors
    .filter((actor) => actor.actorType?.code === actorTypeCode)
    .map((actor) => {
      let name = actor.organization?.sigle || actor.organization?.path || "";
      if (!name) {
        const fullName = [actor.firstname, actor.lastname]
          .filter(Boolean)
          .join(" ")
          .trim();
        name = fullName || actor.email || "Acteur sans nom";
      }
      const email =
        actor.email && !name.includes(actor.email) ? ` (${actor.email})` : "";
      return `${name}${email}`;
    })
    .join("\n");
}

const suffixed = (value: number | null | undefined, unit: string) =>
  value == null ? "" : `${value}${unit}`;
const yesNo = (value: boolean | null | undefined) =>
  value == null ? "" : value ? "Oui" : "Non";
const hostingOptions = (app: GristApplication) =>
  app.hostings.map(({ hostingOption }) => hostingOption);

/// Colonnes de la page de recherche, dans son ordre (AVAILABLE_COLUMNS). Les valeurs sont celles
/// affichées, pas les données brutes.
export const GRIST_COLUMNS: GristColumnDefinition[] = [
  {
    field: "quality",
    colId: "iq",
    label: "IQ",
    type: "Text",
    restricted: false,
    value: (app) => suffixed(app.quality, "%"),
  },
  {
    field: "label",
    colId: "nom",
    label: "Nom",
    type: "Text",
    restricted: false,
    value: (app) => app.label,
  },
  {
    field: "priorityRestart",
    colId: "priorite",
    label: "Priorité",
    type: "Text",
    restricted: false,
    value: (app) =>
      app.priorityRestart ? PRIORITY_SHORT_LABELS[app.priorityRestart] : "",
  },
  {
    field: "hostingDisplay",
    colId: "hebergement",
    label: "Hébergement",
    type: "Text",
    restricted: true,
    value: (app) =>
      hostingOptions(app)
        .map((option) => option?.site ?? "")
        .join(", "),
  },
  {
    field: "tag",
    colId: "tags",
    label: "Tags",
    type: "Text",
    restricted: false,
    value: (app) => app.tags.map((tag) => tag.name).join(", "),
  },
  {
    field: "moa",
    colId: "moa",
    label: "MOA",
    type: "Text",
    restricted: true,
    value: (app) => formatActors(app.actors, "MOA"),
  },
  {
    field: "moe",
    colId: "moe",
    label: "MOE",
    type: "Text",
    restricted: true,
    value: (app) => formatActors(app.actors, "MOE"),
  },
  {
    field: "hostingProviderDisplay",
    colId: "fournisseur",
    label: "Fournisseur",
    type: "Text",
    restricted: true,
    value: (app) =>
      hostingOptions(app)
        .map((option) => option?.provider ?? "")
        .join(", "),
  },
  {
    field: "hostingPlatformDisplay",
    colId: "plateforme",
    label: "Plateforme",
    type: "Text",
    restricted: true,
    value: (app) =>
      hostingOptions(app)
        .map((option) => option?.platform ?? "")
        .join(", "),
  },
  {
    field: "hostingManager",
    colId: "responsable_hebergement",
    label: "Responsable hébergement",
    type: "Text",
    restricted: true,
    value: (app) => formatActors(app.actors, "HEB"),
  },
  {
    field: "businessDivision",
    colId: "direction_metier",
    label: "Direction métier",
    type: "Text",
    restricted: false,
    value: (app) => app.businessDivisions.map(({ label }) => label).join("\n"),
  },
  {
    field: "rsimm",
    colId: "rsimm",
    label: "RSIMM",
    type: "Text",
    restricted: true,
    value: (app) => formatActors(app.actors, "RSSI"),
  },
  {
    field: "dima",
    colId: "dima",
    label: "DIMA",
    type: "Text",
    restricted: true,
    value: (app) => suffixed(app.compliance?.dima_duration_hours, "h"),
  },
  {
    field: "pdma",
    colId: "pdma",
    label: "PDMA",
    type: "Text",
    restricted: true,
    value: (app) => suffixed(app.compliance?.pdma_duration_hours, "h"),
  },
  {
    field: "rgaa",
    colId: "rgaa",
    label: "RGAA",
    type: "Text",
    restricted: true,
    value: (app) => suffixed(app.rgaaScorePercentage, "%"),
  },
  {
    field: "dsfr",
    colId: "dsfr",
    label: "DSFR",
    type: "Text",
    restricted: true,
    value: (app) => yesNo(app.compliance?.dsfr_implemented),
  },
  {
    field: "rgpd",
    colId: "rgpd",
    label: "RGPD",
    type: "Text",
    restricted: true,
    value: (app) => yesNo(app.compliance?.rgpd_has_aipd),
  },
  {
    field: "pra",
    colId: "pra",
    label: "PRA",
    type: "Text",
    restricted: true,
    value: (app) => yesNo(app.compliance?.dima_recovery_plan),
  },
  {
    field: "homologation",
    colId: "homologation",
    label: "Homologation",
    type: "Text",
    restricted: true,
    value: (app) => {
      const status = app.compliance?.homologation_status;
      return status ? (HOMOLOGATION_LABELS[status] ?? status) : "";
    },
  },
  {
    field: "homologationDateEnd",
    colId: "date_fin_homologation",
    label: "Date de fin d'homologation",
    type: "Text",
    restricted: true,
    value: (app) => {
      const date = app.compliance?.homologation_date_end;
      return date ? DATE_FR.format(date) : "";
    },
  },
  {
    field: "status",
    colId: "statut",
    label: "Statut",
    type: "Text",
    restricted: false,
    value: (app) => {
      const status = app.currentStatus?.status;
      return status ? (ApplicationStatusLabels[status] ?? status) : "";
    },
  },
  {
    field: "applicationViews",
    colId: "nb_consultations",
    label: "Nombre de consultations",
    type: "Numeric",
    restricted: false,
    value: (app) => app.applicationViews,
  },
  {
    field: "technicalMaturity",
    colId: "maturite_technique",
    label: "Maturité technique",
    type: "Numeric",
    restricted: false,
    value: (app) => maturity(app, "technicalMaturity"),
  },
  {
    field: "businessMaturity",
    colId: "maturite_metier",
    label: "Maturité métier",
    type: "Numeric",
    restricted: false,
    value: (app) => maturity(app, "businessMaturity"),
  },
  {
    field: "costContainment",
    colId: "maitrise_couts_mco",
    label: "Maîtrise des coûts MCO",
    type: "Numeric",
    restricted: false,
    value: (app) => maturity(app, "costContainment"),
  },
];

export const GRIST_COLUMN_FIELDS = GRIST_COLUMNS.map(({ field }) => field);

/// Colonnes visibles par défaut dans la page (DEFAULT_VISIBLE_COLUMNS), quand l'appel n'en
/// précise pas.
export const DEFAULT_GRIST_COLUMN_FIELDS = [
  "quality",
  "label",
  "priorityRestart",
  "hostingDisplay",
  "tag",
];

/// Vrai si l'application est dans la sélection, faux pour une ligne sortie mais conservée.
/// Toujours écrite et masquée des vues : elle sert au style grisé des lignes sorties.
export const SELECTION_COLUMN = "dans_selection";

/// Colonnes écrites par les versions précédentes de la synchronisation, retirées des tables.
export const OBSOLETE_COLUMNS = ["motif_sortie"];

/// Toutes les colonnes que RefApp peut avoir créées : les autres ont été ajoutées dans Grist.
export const REFAPP_COLUMN_IDS = new Set([
  ...GRIST_COLUMNS.map(({ colId }) => colId),
  SELECTION_COLUMN,
  ...OBSOLETE_COLUMNS,
]);

/// La recherche aplatit la dernière évaluation de dette technique (toSearchItem).
function maturity(
  app: GristApplication,
  key: "technicalMaturity" | "businessMaturity" | "costContainment",
): number | null {
  const debt = app.technicalDebtInfo as unknown as Record<
    typeof key,
    number | null
  > | null;
  return debt?.[key] ?? null;
}
