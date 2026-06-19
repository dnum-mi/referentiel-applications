import { Injectable, Logger } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import * as ExcelJS from "exceljs";
import { columnLabels } from "src/applications/columnLabels/application-export.columnLabels";
import { sheetLabels } from "src/applications/constants/application-export.sheet-labels";
import { COMPLIANCE_METADATA_FIELDS } from "src/compliances/constants/compliance-metadata.constants";
import { CreateComplianceDto } from "src/compliances/dto/create-compliance.dto";
import { CompliancesService } from "src/compliances/compliances.service";
import { detectCompliances } from "src/compliances/utils/compliance.utils";
import { PrismaService } from "src/prisma/prisma.service";
import {
  ImportReportDto,
  ImportReportEntryDto,
} from "../dto/import-report.dto";
import {
  buildHeaderIndex,
  coerceDate,
  coerceNumber,
  coerceOuiNon,
  makeCellReader,
} from "../utils/excel.utils";

type Coercion = "string" | "number" | "boolean" | "date";

/** Champs de l'onglet « Conformités » : clé DTO, libellé de colonne, type de coercion. */
const FIELDS: { key: keyof CreateComplianceDto; coerce: Coercion }[] = [
  { key: "dima_duration_hours", coerce: "number" },
  { key: "dima_is_hno", coerce: "boolean" },
  { key: "dima_business_impact", coerce: "string" },
  { key: "dima_recovery_plan", coerce: "boolean" },
  { key: "dima_recovery_solutions", coerce: "string" },
  { key: "dima_last_test_date", coerce: "date" },
  { key: "dima_test_result", coerce: "string" },
  { key: "dima_recovery_manager", coerce: "string" },
  { key: "pdma_duration_hours", coerce: "number" },
  { key: "pdma_data_types", coerce: "string" },
  { key: "pdma_backup_frequency", coerce: "string" },
  { key: "pdma_backup_method", coerce: "string" },
  { key: "pdma_backup_storage", coerce: "string" },
  { key: "pdma_last_test_date", coerce: "date" },
  { key: "pdma_test_result", coerce: "string" },
  { key: "pdma_restoration_manager", coerce: "string" },
  { key: "homologation_date_end", coerce: "date" },
  { key: "homologation_rssi_id", coerce: "string" },
  { key: "dsfr_implemented", coerce: "boolean" },
  { key: "dsfr_version", coerce: "string" },
  { key: "rgpd_has_aipd", coerce: "boolean" },
  { key: "rgpd_dpo_name", coerce: "string" },
];

@Injectable()
export class CompliancesSheetProcessor {
  readonly sheetName = sheetLabels.Compliances;
  private readonly logger = new Logger(CompliancesSheetProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly compliancesService: CompliancesService,
  ) {}

  async process(
    worksheet: ExcelJS.Worksheet,
    requestorId: string,
    report: ImportReportDto,
  ): Promise<void> {
    const headerIndex = buildHeaderIndex(worksheet);
    if (!(columnLabels.applicationId in headerIndex)) {
      const message = `Onglet « ${this.sheetName} » non traité : colonnes manquantes (${columnLabels.applicationId}).`;
      report.logs.push(message);
      this.logger.warn(message);
      return;
    }

    report.summary.processedSheets.push(this.sheetName);

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const getCell = makeCellReader(headerIndex, worksheet.getRow(rowNumber));
      const applicationId = getCell(columnLabels.applicationId);
      const values = this.readValues(getCell);

      // Ligne entièrement vide : ignorée silencieusement.
      if (applicationId === "" && Object.keys(values).length === 0) continue;

      try {
        const entry = await this.processRow(
          rowNumber,
          applicationId,
          values,
          requestorId,
        );
        report.entries.push(entry);
        if (entry.status === "created") report.summary.created++;
        else if (entry.status === "updated") report.summary.updated++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        report.entries.push({
          sheet: this.sheetName,
          row: rowNumber,
          status: "error",
          identifier: applicationId || undefined,
          message,
        });
        report.summary.errors++;
        this.logger.warn(
          `Ligne ${rowNumber} (${this.sheetName}) en erreur : ${message}`,
        );
      }
    }
  }

  /** Lit et coerce les champs de conformité présents (non vides) de la ligne. */
  private readValues(
    getCell: (header: string) => string,
  ): Record<string, string | number | boolean> {
    const values: Record<string, string | number | boolean> = {};
    for (const { key, coerce } of FIELDS) {
      const raw = getCell(columnLabels[key] ?? key);
      if (raw === "") continue;
      const value =
        coerce === "boolean"
          ? coerceOuiNon(raw)
          : coerce === "number"
            ? coerceNumber(raw)
            : coerce === "date"
              ? coerceDate(raw)
              : raw;
      if (value !== undefined) values[key] = value;
    }
    return values;
  }

  private async processRow(
    row: number,
    applicationId: string,
    values: Record<string, string | number | boolean>,
    requestorId: string,
  ): Promise<ImportReportEntryDto> {
    if (!applicationId) {
      throw new Error("Colonne « ID Application » vide.");
    }

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true },
    });
    if (!application) {
      throw new Error(`Application introuvable (id=${applicationId}).`);
    }

    const dto = plainToInstance(CreateComplianceDto, values);
    await this.validateDto(dto);

    const existing =
      await this.compliancesService.findByApplicationId(applicationId);

    const sections = detectCompliances(Object.keys(values));
    const sectionSuffix = sections.length ? ` (${sections.join(", ")})` : "";

    await this.compliancesService.createOrUpdateByApplicationId(
      applicationId,
      dto,
      {
        applicationId,
        metadata: {
          userId: requestorId,
          gender: "de la conformité",
          getColumn: () => sectionSuffix,
          entity: "complianceId",
          fields: COMPLIANCE_METADATA_FIELDS,
        },
      },
    );

    return {
      sheet: this.sheetName,
      row,
      status: existing ? "updated" : "created",
      identifier: applicationId,
    };
  }

  private async validateDto(dto: CreateComplianceDto): Promise<void> {
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: false,
    });
    if (errors.length > 0) {
      const details = errors
        .map((e) => Object.values(e.constraints ?? {}).join(", "))
        .filter(Boolean)
        .join(" ; ");
      throw new Error(`Validation échouée : ${details}`);
    }
  }
}
