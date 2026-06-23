import { Injectable, Logger } from "@nestjs/common";
import { Status, priorityRestart } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import * as ExcelJS from "exceljs";
import { ApplicationService } from "src/applications/application.service";
import { columnLabels } from "src/applications/columnLabels/application-export.columnLabels";
import { sheetLabels } from "src/applications/constants/application-export.sheet-labels";
import { PriorityRestartLabels } from "src/applications/constants/enum-label";
import {
  CreateApplicationDto,
  PatchApplicationDto,
} from "src/applications/dto/create-application.dto";
import { roleToPermissions } from "src/permissions/role-to-permissions";
import { PrismaService } from "src/prisma/prisma.service";
import { Requestor } from "src/user/entities/user.entity";
import { UserService } from "src/user/user.service";
import {
  ImportReportDto,
  ImportReportEntryDto,
} from "../dto/import-report.dto";
import { buildHeaderIndex, makeCellReader } from "../utils/excel.utils";

/** En-têtes (libellés) attendus dans l'onglet « Applications », alignés sur l'export. */
const HEADERS = {
  id: columnLabels.id,
  label: columnLabels.label,
  shortName: columnLabels.shortName,
  logo: columnLabels.logo,
  description: columnLabels.description,
  tags: columnLabels.tags,
  purposes: columnLabels.purposes,
  targetPopulations: columnLabels.targetPopulations,
  priorityRestart: columnLabels.priorityRestart,
} as const;

/** Colonnes sans lesquelles l'onglet ne peut pas être traité. */
const REQUIRED_HEADERS = [HEADERS.id, HEADERS.label];

/** Statut par défaut affecté à une application créée par import (équivalent création API). */
const DEFAULT_CREATE_STATUS: Status = Status.under_construction;

/** Libellé d'export d'une priorité de redémarrage → code enum (résolution de repli). */
const PRIORITY_LABEL_TO_CODE: Record<string, priorityRestart> = Object.entries(
  PriorityRestartLabels,
).reduce(
  (acc, [code, label]) => {
    acc[label] = code as priorityRestart;
    return acc;
  },
  {} as Record<string, priorityRestart>,
);

/** Découpe une cellule multi-valeurs de l'export (séparateur « , ») en tableau nettoyé. */
function splitList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Traitement de l'onglet « Applications » (US #752, phase 3). Toujours traité en premier par
 * l'orchestrateur. Une ligne avec un « Identifiant » met à jour l'application correspondante ;
 * sinon une application est créée. Les contrôles et métadonnées sont identiques à l'API.
 */
@Injectable()
export class ApplicationsSheetProcessor {
  readonly sheetName = sheetLabels.Applications;
  private readonly logger = new Logger(ApplicationsSheetProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly applicationService: ApplicationService,
    private readonly userService: UserService,
  ) {}

  async process(
    worksheet: ExcelJS.Worksheet,
    requestorId: string,
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

    // La mise à jour d'application requiert le `Requestor` complet (permissions) ; on le résout
    // une fois pour tout l'onglet à partir de l'utilisateur courant.
    const requestor = await this.resolveRequestor(requestorId);
    if (!requestor) {
      const message = `Onglet « ${this.sheetName} » non traité : utilisateur courant introuvable.`;
      report.logs.push(message);
      this.logger.warn(message);
      return;
    }

    report.summary.processedSheets.push(this.sheetName);

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const getCell = makeCellReader(headerIndex, worksheet.getRow(rowNumber));
      const data = {
        id: getCell(HEADERS.id),
        label: getCell(HEADERS.label),
        shortName: getCell(HEADERS.shortName),
        logo: getCell(HEADERS.logo),
        description: getCell(HEADERS.description),
        tags: getCell(HEADERS.tags),
        purposes: getCell(HEADERS.purposes),
        targetPopulations: getCell(HEADERS.targetPopulations),
        priorityRestart: getCell(HEADERS.priorityRestart),
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
          identifier: data.label || data.id || undefined,
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
      label: string;
      shortName: string;
      logo: string;
      description: string;
      tags: string;
      purposes: string;
      targetPopulations: string;
      priorityRestart: string;
    },
    requestor: Requestor,
  ): Promise<ImportReportEntryDto> {
    const identifier = data.label || data.id;

    const baseFields = this.compact({
      label: data.label || undefined,
      shortName: data.shortName || undefined,
      logo: data.logo || undefined,
      description: data.description || undefined,
      tags: data.tags ? splitList(data.tags) : undefined,
      purposes: data.purposes ? splitList(data.purposes) : undefined,
      targetPopulations: data.targetPopulations
        ? splitList(data.targetPopulations)
        : undefined,
      priorityRestart: this.resolvePriority(data.priorityRestart),
    });

    if (data.id) {
      const existing = await this.prisma.application.findUnique({
        where: { id: data.id },
        select: { id: true },
      });
      if (!existing) {
        throw new Error(`Application introuvable (id=${data.id}).`);
      }

      const dto = plainToInstance(PatchApplicationDto, baseFields);
      await this.validateDto(dto);
      await this.applicationService.update({
        applicationId: data.id,
        data: dto,
        requestor,
      });
      return { sheet: this.sheetName, row, status: "updated", identifier };
    }

    const dto = plainToInstance(CreateApplicationDto, {
      ...baseFields,
      // `createApplication` transmet `tags` tel quel à `findByNames` (sans défaut) : on garantit
      // un tableau à la création pour ne pas déréférencer `undefined`.
      tags: baseFields.tags ?? [],
      status: { status: DEFAULT_CREATE_STATUS },
    });
    await this.validateDto(dto);
    await this.applicationService.createApplication(requestor.id, dto);
    return { sheet: this.sheetName, row, status: "created", identifier };
  }

  /** Reconstitue le `Requestor` (avec permissions) de l'utilisateur courant. */
  private async resolveRequestor(
    requestorId: string,
  ): Promise<Requestor | null> {
    const user = await this.userService.findByIdWithRelations(requestorId);
    if (!user) return null;
    return { ...user, permissions: roleToPermissions(user.role) };
  }

  /** Résout la priorité de redémarrage par code (« R0 ») puis par libellé d'export. */
  private resolvePriority(value: string): priorityRestart | undefined {
    if (!value) return undefined;
    if (value in priorityRestart) return value as priorityRestart;
    return PRIORITY_LABEL_TO_CODE[value];
  }

  /** Retire les clés `undefined` pour ne pas remonter de valeurs vides à la validation. */
  private compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined),
    ) as Partial<T>;
  }

  private async validateDto(
    dto: CreateApplicationDto | PatchApplicationDto,
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
}
