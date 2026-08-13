import { Injectable, Logger } from "@nestjs/common";
import { Permission } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import * as ExcelJS from "exceljs";
import { ActorService } from "src/actor/actor.service";
import { CreateActorDto, UpdateActorDto } from "src/actor/dto/actor.dto";
import { columnLabels } from "src/applications/columnLabels/application-export.columnLabels";
import { sheetLabels } from "src/applications/constants/application-export.sheet-labels";
import { CheckPermissions } from "src/common/service/check-permissions.service";
import { PrismaService } from "src/prisma/prisma.service";
import { Requestor } from "src/user/entities/user.entity";
import {
  ImportReportDto,
  ImportReportEntryDto,
} from "../dto/import-report.dto";
import {
  buildHeaderIndex,
  insufficientRightsMessage,
  makeCellReader,
  validateImportDto,
} from "../utils/excel.utils";

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
export class ActorsSheetProcessor {
  readonly sheetName = sheetLabels.Actors;
  private readonly logger = new Logger(ActorsSheetProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly actorService: ActorService,
    private readonly checkPermissions: CheckPermissions,
  ) {}

  async process(
    worksheet: ExcelJS.Worksheet,
    requestor: Requestor,
    report: ImportReportDto,
  ): Promise<void> {
    const headerIndex = buildHeaderIndex(worksheet);
    const missing = REQUIRED_HEADERS.filter((h) => !(h in headerIndex));
    if (missing.length > 0) {
      const message = `Onglet « ${this.sheetName} » non traité : colonnes manquantes (${missing.join(", ")}).`;
      report.logs.push(message);
      this.logger.warn(message);
      return;
    }

    report.summary.processedSheets.push(this.sheetName);

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const getCell = makeCellReader(headerIndex, worksheet.getRow(rowNumber));
      const data = {
        id: getCell(HEADERS.id),
        applicationId: getCell(HEADERS.applicationId),
        firstname: getCell(HEADERS.firstname),
        lastname: getCell(HEADERS.lastname),
        role: getCell(HEADERS.role),
        type: getCell(HEADERS.type),
        email: getCell(HEADERS.email),
      };

      // Ligne entièrement vide : ignorée silencieusement.
      if (Object.values(data).every((v) => v === "")) continue;

      try {
        const entry = await this.processRow(rowNumber, data, requestor);
        report.entries.push(entry);
        if (entry.status === "created") report.summary.created++;
        else if (entry.status === "updated") report.summary.updated++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        report.entries.push({
          sheet: this.sheetName,
          row: rowNumber,
          status: "error",
          identifier: data.id || data.email || undefined,
          message,
        });
        report.summary.errors++;
        this.logger.warn(
          `Ligne ${rowNumber} (${this.sheetName}) en erreur : ${message}`,
        );
      }
    }
  }

  private async processRow(
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
    requestor: Requestor,
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

    // Droits applicatifs (portée incluse) sur CETTE application, comme l'API acteurs.
    const allowed = await this.checkPermissions.can(
      [Permission.ActorWrite],
      requestor,
      data.applicationId,
    );
    if (!allowed) {
      throw new Error(
        insufficientRightsMessage("ActorWrite", data.applicationId),
      );
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
      await validateImportDto(dto);
      await this.actorService.update(
        data.id,
        dto,
        data.applicationId,
        requestor.id,
      );

      return { sheet: this.sheetName, row, status: "updated", identifier };
    }

    const dto = plainToInstance(CreateActorDto, {
      ...baseFields,
      isGroup: false,
    });
    await validateImportDto(dto);
    await this.actorService.create(dto, data.applicationId, requestor.id);

    return { sheet: this.sheetName, row, status: "created", identifier };
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
}
