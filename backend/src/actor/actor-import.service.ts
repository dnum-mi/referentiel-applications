import { Injectable, Logger } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import * as ExcelJS from "exceljs";
import { columnLabels } from "src/applications/columnLabels/application-export.columnLabels";
import { sheetLabels } from "src/applications/constants/application-export.sheet-labels";
import { PrismaService } from "src/prisma/prisma.service";
import { ActorService } from "./actor.service";
import { CreateActorDto, UpdateActorDto } from "./dto/actor.dto";
import { ImportReportDto, ImportReportEntryDto } from "./dto/import-report.dto";

/** En-têtes (libellés) attendus dans l'onglet « Acteurs », alignés sur l'export. */
const HEADERS = {
  id: columnLabels["actors.id"],
  applicationId: columnLabels.applicationId,
  firstname: columnLabels["actors.firstname"],
  lastname: columnLabels["actors.lastname"],
  role: columnLabels["actors.role"],
  type: columnLabels["actors.type"],
  email: columnLabels["actors.email"],
} as const;

/** Colonnes sans lesquelles l'onglet ne peut pas être traité. */
const REQUIRED_HEADERS = [HEADERS.id, HEADERS.applicationId, HEADERS.role];

@Injectable()
export class ActorImportService {
  private readonly logger = new Logger(ActorImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly actorService: ActorService,
  ) {}

  async importFromExcel(
    buffer: Buffer,
    requestorId: string,
  ): Promise<ImportReportDto> {
    const report: ImportReportDto = {
      summary: {
        processedSheets: [],
        ignoredSheets: [],
        created: 0,
        updated: 0,
        errors: 0,
      },
      entries: [],
      logs: [],
    };

    const workbook = new ExcelJS.Workbook();
    try {
      // exceljs déclare son propre `interface Buffer extends ArrayBuffer`,
      // incompatible avec le Buffer générique de Node bien que correct au runtime.
      await workbook.xlsx.load(
        buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
      );
    } catch {
      report.logs.push("Le fichier fourni n'est pas un classeur Excel valide.");
      throw new Error("Le fichier fourni n'est pas un classeur Excel valide.");
    }

    // L'onglet « Applications » est toujours traité en premier (phases ultérieures).
    // Phase 1 : seul l'onglet « Acteurs » est traité ici.
    await this.processActorsSheet(workbook, requestorId, report);

    // Onglets présents mais non pris en charge en phase 1.
    for (const sheet of workbook.worksheets) {
      if (
        sheet.name !== sheetLabels.Actors &&
        !report.summary.ignoredSheets.includes(sheet.name)
      ) {
        report.summary.ignoredSheets.push(sheet.name);
      }
    }

    return report;
  }

  private async processActorsSheet(
    workbook: ExcelJS.Workbook,
    requestorId: string,
    report: ImportReportDto,
  ): Promise<void> {
    const sheetName = sheetLabels.Actors;
    const worksheet = workbook.getWorksheet(sheetName);

    if (!worksheet) {
      report.summary.ignoredSheets.push(sheetName);
      report.logs.push(`Onglet « ${sheetName} » absent : ignoré.`);
      return;
    }

    const headerIndex = this.buildHeaderIndex(worksheet);
    const missing = REQUIRED_HEADERS.filter((h) => !(h in headerIndex));
    if (missing.length > 0) {
      const message = `Onglet « ${sheetName} » non traité : colonnes manquantes (${missing.join(", ")}).`;
      report.logs.push(message);
      this.logger.warn(message);
      return;
    }

    report.summary.processedSheets.push(sheetName);

    const getCell = (row: ExcelJS.Row, header: string): string => {
      const col = headerIndex[header];
      if (!col) return "";
      return this.cellToString(row.getCell(col).value);
    };

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);

      const data = {
        id: getCell(row, HEADERS.id),
        applicationId: getCell(row, HEADERS.applicationId),
        firstname: getCell(row, HEADERS.firstname),
        lastname: getCell(row, HEADERS.lastname),
        role: getCell(row, HEADERS.role),
        type: getCell(row, HEADERS.type),
        email: getCell(row, HEADERS.email),
      };

      // Ligne entièrement vide : ignorée silencieusement.
      if (Object.values(data).every((v) => v === "")) continue;

      try {
        const entry = await this.processActorRow(
          sheetName,
          rowNumber,
          data,
          requestorId,
        );
        report.entries.push(entry);
        if (entry.status === "created") report.summary.created++;
        else if (entry.status === "updated") report.summary.updated++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        report.entries.push({
          sheet: sheetName,
          row: rowNumber,
          status: "error",
          identifier: data.id || data.email || undefined,
          message,
        });
        report.summary.errors++;
        this.logger.warn(
          `Ligne ${rowNumber} (${sheetName}) en erreur : ${message}`,
        );
      }
    }
  }

  private async processActorRow(
    sheet: string,
    row: number,
    data: {
      id: string;
      applicationId: string;
      firstname: string;
      lastname: string;
      role: string;
      type: string;
      email: string;
    },
    requestorId: string,
  ): Promise<ImportReportEntryDto> {
    if (!data.applicationId) {
      throw new Error("Colonne « ID Application » vide.");
    }

    const application = await this.prisma.application.findUnique({
      where: { id: data.applicationId },
      select: { id: true },
    });
    if (!application) {
      throw new Error(`Application introuvable (id=${data.applicationId}).`);
    }

    const actorTypeId = await this.resolveActorTypeId(data.role, data.type);
    if (!actorTypeId) {
      throw new Error(
        `Type d'acteur introuvable pour le rôle « ${data.role} ».`,
      );
    }

    const baseFields = {
      firstname: data.firstname || undefined,
      lastname: data.lastname || undefined,
      email: data.email || undefined,
      actorTypeId,
      applicationId: data.applicationId,
    };

    const identifier =
      data.email || `${data.firstname} ${data.lastname}`.trim();

    if (data.id) {
      const existing = await this.prisma.actor.findUnique({
        where: { id: data.id },
        select: { id: true },
      });
      if (!existing) {
        throw new Error(`Acteur introuvable (id=${data.id}).`);
      }

      const dto = plainToInstance(UpdateActorDto, baseFields);
      await this.validateDto(dto);
      await this.actorService.update(
        data.id,
        dto,
        data.applicationId,
        requestorId,
      );

      return { sheet, row, status: "updated", identifier };
    }

    const dto = plainToInstance(CreateActorDto, {
      ...baseFields,
      isGroup: false,
    });
    await this.validateDto(dto);
    await this.actorService.create(dto, data.applicationId, requestorId);

    return { sheet, row, status: "created", identifier };
  }

  /** Résout l'ActorType par code (colonne « Rôle ») puis par libellé (colonne « Type »). */
  private async resolveActorTypeId(
    role: string,
    type: string,
  ): Promise<string | null> {
    if (role) {
      const byCode = await this.prisma.actorType.findFirst({
        where: { code: role },
        select: { id: true },
      });
      if (byCode) return byCode.id;
    }
    if (type) {
      const byLabel = await this.prisma.actorType.findFirst({
        where: { label: type },
        select: { id: true },
      });
      if (byLabel) return byLabel.id;
    }
    return null;
  }

  private async validateDto(
    dto: CreateActorDto | UpdateActorDto,
  ): Promise<void> {
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

  private buildHeaderIndex(
    worksheet: ExcelJS.Worksheet,
  ): Record<string, number> {
    const headerRow = worksheet.getRow(1);
    const index: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      const label = this.cellToString(cell.value);
      if (label) index[label] = colNumber;
    });
    return index;
  }

  private cellToString(value: ExcelJS.CellValue): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "object") {
      const obj = value as {
        text?: string;
        hyperlink?: string;
        result?: unknown;
        richText?: { text: string }[];
      };
      if (typeof obj.text === "string") return obj.text.trim();
      if (Array.isArray(obj.richText)) {
        return obj.richText
          .map((part) => part.text)
          .join("")
          .trim();
      }
      if (obj.result !== undefined && obj.result !== null) {
        return String(obj.result).trim();
      }
    }
    return "";
  }
}
