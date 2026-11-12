import { ForbiddenException, Injectable } from "@nestjs/common";
import { Permission } from "@prisma/client";
import { CheckPermissions } from "src/common/service/check-permissions.service";
import { ExcelBuilderService } from "src/common/service/excel-builder.service";
import { GRIST_COLUMNS } from "src/grist/grist-columns";
import type { Requestor } from "src/user/entities/user.entity";
import { ApplicationService } from "./application.service";
import { ALL_ENUM_LABELS, RelationTypeLabels } from "./constants/enum-label";
import type { ExportApplicationViewDto } from "./dto/export-application-view.dto";
import type { ApplicationSearchDto } from "./dto/search-application.dto";

const FILTER_LABELS: Partial<Record<keyof ApplicationSearchDto, string>> = {
  search: "Recherche par nom",
  q: "Recherche dans les fiches",
  qPrefix: "Recherche par préfixe",
  label: "Nom",
  shortName: "Nom court",
  tag: "Tags",
  priorityRestart: "Priorité de redémarrage",
  actorType: "Type d’acteur",
  actorEmail: "Adresse e-mail de l’acteur",
  missingMoa: "Sans MOA",
  missingMoe: "Sans MOE",
  missingHosting: "Sans hébergement",
  currentStatus__in: "Statuts retenus",
  currentStatus__isNull: "Inclure les fiches sans statut",
  subscribersEmail: "Mes abonnements",
  myApplications: "Mes applications",
  isActor: "Applications dont je suis acteur",
  organization: "Organisation",
  hostingSearch: "Hébergement",
  hostingSite: "Site d’hébergement",
  hostingPlatform: "Plateforme d’hébergement",
  hostingProvider: "Fournisseur d’hébergement",
  hostingBuilding: "Bâtiment d’hébergement",
  hostingRoom: "Salle d’hébergement",
  technologyEolStatus: "Fin de vie des technologies",
  compliance__in: "Conformités",
  compliancePresent__in: "Conformités présentes",
  complianceAbsent__in: "Conformités absentes",
  complianceUnset__in: "Conformités non renseignées",
  link: "Lien associé",
  iqGte: "IQ minimum (%)",
  iqLte: "IQ maximum (%)",
  iq__isNull: "Inclure les fiches sans IQ",
  relationAppId: "Application de référence (identifiant)",
  businessDivisionId: "Directions métier (identifiants)",
  dataSourceName: "Source de données",
  millesime: "Millésime",
  ...RelationTypeLabels,
};

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

function formatFilter(key: string, value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => formatFilter(key, item)).join(", ");
  }
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  const text = String(value);
  if (Object.hasOwn(RelationTypeLabels, key)) {
    return text === "INCLUDE" ? "Inclure" : "Exclure";
  }
  if (
    (key === "currentStatus__in" || key === "priorityRestart") &&
    Object.hasOwn(ALL_ENUM_LABELS, text)
  ) {
    return ALL_ENUM_LABELS[text];
  }
  return text;
}

function catalogueUrl(path?: string, origin?: string): string | undefined {
  if (!path || !origin) return;
  try {
    const base = new URL(origin);
    const url = new URL(path, base);
    if (
      (base.protocol === "http:" || base.protocol === "https:") &&
      url.origin === base.origin &&
      !url.username &&
      !url.password &&
      url.pathname.endsWith("/recherche-application")
    ) {
      return url.href;
    }
  } catch {
    // L’export fonctionne aussi pour les appels API sans adresse de catalogue.
  }
}

@Injectable()
export class ApplicationTableExportService {
  constructor(
    private readonly applicationService: ApplicationService,
    private readonly checkPermissions: CheckPermissions,
    private readonly excelBuilder: ExcelBuilderService,
  ) {}

  async exportExcel(
    filters: ApplicationSearchDto,
    selection: ExportApplicationViewDto,
    requestor: Requestor,
    origin?: string,
  ): Promise<Buffer> {
    const columns = selection.columns.map(
      (field) => GRIST_COLUMNS.find((column) => column.field === field)!,
    );
    if (
      columns.some((column) => column.restricted) &&
      !(await this.checkPermissions.can([Permission.ColumnRead], requestor))
    ) {
      throw new ForbiddenException(
        "Vous n’avez plus accès à certaines colonnes demandées.",
      );
    }

    const { results } = await this.applicationService.search(
      { ...filters, page: 0, pageSize: 0 },
      requestor,
    );
    const context = [
      {
        criterion: "Généré le (heure de Paris)",
        value: DATE_FORMAT.format(new Date()),
      },
      { criterion: "Nombre d’applications", value: results.length },
    ];
    const link = catalogueUrl(selection.cataloguePath, origin);
    if (link) {
      context.push(
        { criterion: "Rouvrir la recherche", value: link },
        {
          criterion: "À propos du lien",
          value:
            "Le classeur est un instantané. Le lien applique les droits et les critères à jour de la personne qui l’ouvre.",
        },
      );
    }

    for (const [key, value] of Object.entries(filters)) {
      const label = FILTER_LABELS[key as keyof ApplicationSearchDto];
      if (
        label &&
        value != null &&
        value !== "" &&
        !(value === "NEUTRAL" && Object.hasOwn(RelationTypeLabels, key))
      ) {
        context.push({ criterion: label, value: formatFilter(key, value) });
      }
    }

    return this.excelBuilder.buildWorkbook([
      {
        name: "Vue du catalogue",
        columns: columns.map(({ field, label }) => ({
          header: label,
          key: field,
          width: 30,
        })),
        rows: results.map((app) =>
          Object.fromEntries(
            columns.map(({ field, value }) => [field, value(app)]),
          ),
        ),
      },
      {
        name: "Contexte",
        columns: [
          { header: "Critère", key: "criterion", width: 34 },
          { header: "Valeur", key: "value", width: 78, hyperlink: true },
        ],
        rows: context,
      },
    ]);
  }
}
