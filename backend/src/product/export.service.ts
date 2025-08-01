import { ExportApplicationsUseCase } from "./application/usecases/application-export.usecase";
import { Injectable } from "@nestjs/common";
import { ApplicationRepository } from "./infrastructure/repository/application.repository";
import { ApplicationSearchDto } from "./application/dto/search-application.dto";
import { ApplicationsExport } from "@prisma/client";

@Injectable()
export class ApplicationExportService {
  constructor(
    private readonly repository: ApplicationRepository,
    private readonly exportApplicationsUseCase: ExportApplicationsUseCase,
  ) {}

  async exportApplicationsToExcel(): Promise<Buffer> {
    return this.exportApplicationsUseCase.execute();
  }

  async exportSearchResultsToExcel(
    searchParams: ApplicationSearchDto,
  ): Promise<Buffer> {
    const searchResult
      = await this.repository.findApplicationsBySearch(searchParams);

    // Get full relations for the filtered applications
    const filteredIds = searchResult.results.map(app => app.id);
    const applicationsWithRelations
      = await this.repository.findAllWithRelations();
    const filteredApplications = applicationsWithRelations.filter(app =>
      filteredIds.includes(app.id),
    );

    return this.exportApplicationsUseCase.executeWithApps(filteredApplications);
  }

  async exportApplications(
    filters?: ApplicationSearchDto,
  ): Promise<{ fileName: string, csv: string }> {
    let detailedApps: ApplicationsExport[];

    if (filters && Object.keys(filters).length > 0) {
      detailedApps = await this.repository.findDetailedExportBySearch(filters);
    } else {
      detailedApps = await this.repository.findAllForDetailedExport();
    }

    const allColumns = [
      "id",
      "application",
      "short",
      "description",
      "priorityRestart",
      "hebergements",
      "tags",
      "MOA",
      "MOE",
      "Hebergeur",
      "RSSIM",
      "AutresActeurs",
      "ConformitePDMA",
      "ConformiteDIMA",
      "ConformitePRA",
      "ConformiteRGAA",
      "ConformiteDSFR",
      "ConformiteAIPD",
      "AutresConformites",
      "liens",
    ];

    return this.generateDetailedExportCsv(detailedApps, allColumns);
  }

  public generateCsv(
    data: Record<string, string>[],
    fields: string[],
    headers: string[],
  ): string {
    const csvRows = [headers.join(",")];

    data.forEach((row) => {
      const rowData = fields.map((field) => {
        const value = row[field] ?? "";
        const escaped = String(value).replace(/"/g, "\"\"");
        return `"${escaped}"`;
      });
      csvRows.push(rowData.join(","));
    });

    return csvRows.join("\n");
  }

  private generateDetailedExportCsv(
    detailedApps: ApplicationsExport[],
    columns: string[],
  ): { fileName: string, csv: string } {
    const defaultColumns = ["id", "application", "description"];

    const availableColumns = [
      "id",
      "application",
      "short",
      "description",
      "priorityRestart",
      "hebergements",
      "tags",
      "MOA",
      "MOE",
      "Hebergeur",
      "RSSIM",
      "AutresActeurs",
      "ConformitePDMA",
      "ConformiteDIMA",
      "ConformitePRA",
      "ConformiteRGAA",
      "ConformiteDSFR",
      "ConformiteAIPD",
      "AutresConformites",
      "liens",
    ];

    const columnArray = Array.isArray(columns) ? columns : [columns];
    const allRequested = columnArray.length ? columnArray : defaultColumns;

    const selected = allRequested
      .filter((c): c is string => typeof c === "string")
      .filter(c => availableColumns.includes(c));

    const ignored = allRequested.filter(c => !selected.includes(c));
    if (ignored.length > 0) {
      console.warn("Colonnes ignorées :", ignored);
    }

    // Map the detailed view data
    const data = detailedApps.map((app) => {
      const row: Record<string, string> = {};
      for (const col of selected) {
        const value = (app as any)[col];
        row[col] = Array.isArray(value)
          ? value.join(", ")
          : String(value ?? "");
      }
      return row;
    });

    // Create user-friendly headers
    const detailedColumnLabels: Record<string, string> = {
      id: "ID",
      application: "Application",
      short: "Nom court",
      description: "Description",
      priorityRestart: "Priorité Restart",
      hebergements: "Hébergements",
      tags: "Tags",
      MOA: "Maîtrise d'Ouvrage",
      MOE: "Maîtrise d'Œuvre",
      Hebergeur: "Responsable de l'hébergement",
      RSSIM: "Responsable des SI Métier et de la Modernisation",
      AutresActeurs: "Autres Acteurs",
      ConformitePDMA: "Conformité PDMA",
      ConformiteDIMA: "Conformité DIMA",
      ConformitePRA: "Conformité PRA",
      ConformiteRGAA: "Conformité RGAA",
      ConformiteDSFR: "Conformité DSFR",
      ConformiteAIPD: "Conformité AIPD",
      AutresConformites: "Autres Conformités",
      liens: "Liens",
    };

    const csvHeaders = selected.map(
      field => detailedColumnLabels[field] ?? field,
    );
    const csv = this.generateCsv(data, selected, csvHeaders);

    const date = new Date().toISOString().split("T")[0];

    const safeLabelParts = csvHeaders
      .map(label =>
        label
          .normalize("NFD")
          .replace(/[\u0300-\u036F]/g, "")
          .replace(/\W+/g, "_")
          .replace(/^_+|_+$/g, ""),
      )
      .slice(0, 5);

    const colsPart
      = selected.length <= 4
        ? safeLabelParts.join("_")
        : `${selected.length}_colonnes`;

    const fileName = `referentiel_application_detailed_${colsPart}_${date}.csv`;

    return { fileName, csv };
  }
}
