import { Injectable, Logger } from "@nestjs/common";
import { Permission } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import * as ExcelJS from "exceljs";
import { columnLabels } from "src/applications/columnLabels/application-export.columnLabels";
import { sheetLabels } from "src/applications/constants/application-export.sheet-labels";
import { CheckPermissions } from "src/common/service/check-permissions.service";
import { CreateHostingOptionDto } from "src/hosting-option/dto/hosting-option.dto";
import {
  CreateHostingDto,
  UpdateHostingDto,
} from "src/hostings/dto/hosting.dto";
import { HostingsService } from "src/hostings/hostings.service";
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
} from "../utils/excel.utils";

/** En-têtes (libellés) attendus dans l'onglet « Hébergements », alignés sur l'export. */
const HEADERS = {
  id: columnLabels["hostings.id"],
  applicationId: columnLabels.applicationId,
  label: columnLabels["hostings.label"],
  provider: columnLabels["hostings.provider"],
  site: columnLabels["hostings.site"],
  platform: columnLabels["hostings.platform"],
  building: columnLabels["hostings.building"],
  room: columnLabels["hostings.room"],
} as const;

/** Colonnes sans lesquelles l'onglet ne peut pas être traité. */
const REQUIRED_HEADERS = [HEADERS.id, HEADERS.applicationId];

/**
 * Traitement de l'onglet « Hébergements » (US #752, phase 3). Une ligne avec un « ID Hébergement »
 * met à jour l'hébergement correspondant ; sinon il est créé. L'option d'hébergement
 * (fournisseur/site/plateforme/bâtiment/salle) est résolue par correspondance, et créée si besoin,
 * comme via l'API.
 */
@Injectable()
export class HostingsSheetProcessor {
  readonly sheetName = sheetLabels.Hostings;
  private readonly logger = new Logger(HostingsSheetProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hostingsService: HostingsService,
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
        label: getCell(HEADERS.label),
        provider: getCell(HEADERS.provider),
        site: getCell(HEADERS.site),
        platform: getCell(HEADERS.platform),
        building: getCell(HEADERS.building),
        room: getCell(HEADERS.room),
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
          identifier: this.identifierOf(data),
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
      label: string;
      provider: string;
      site: string;
      platform: string;
      building: string;
      room: string;
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

    // Droits applicatifs (portée incluse) sur CETTE application, comme l'API hébergements.
    const allowed = await this.checkPermissions.can(
      [Permission.HostingWrite],
      requestor,
      data.applicationId,
    );
    if (!allowed) {
      throw new Error(
        insufficientRightsMessage("HostingWrite", data.applicationId),
      );
    }

    const hostingOptionId = await this.resolveHostingOptionId(data);
    const identifier = this.identifierOf(data);

    if (data.id) {
      const existing = await this.prisma.hosting.findUnique({
        where: { id: data.id },
        select: { id: true },
      });
      if (!existing) {
        throw new Error(`Hébergement introuvable (id=${data.id}).`);
      }

      const dto = plainToInstance(UpdateHostingDto, {
        label: data.label || undefined,
        applicationId: data.applicationId,
        ...(hostingOptionId && { hostingOptionId }),
      });
      await this.validateDto(dto);
      await this.hostingsService.updateHosting(data.id, dto, requestor.id);
      return { sheet: this.sheetName, row, status: "updated", identifier };
    }

    const dto = plainToInstance(CreateHostingDto, {
      label: data.label || undefined,
      applicationId: data.applicationId,
      ...(hostingOptionId && { hostingOptionId }),
      isActive: null,
    });
    await this.validateDto(dto);
    await this.hostingsService.createHosting(dto, requestor.id);
    return { sheet: this.sheetName, row, status: "created", identifier };
  }

  /**
   * Résout l'option d'hébergement par correspondance exacte (fournisseur/site/plateforme/bâtiment/
   * salle) ; la crée si absente lorsque les champs obligatoires sont renseignés. Retourne
   * `undefined` si aucun champ d'option n'est fourni (hébergement sans option).
   */
  private async resolveHostingOptionId(data: {
    provider: string;
    site: string;
    platform: string;
    building: string;
    room: string;
  }): Promise<string | undefined> {
    const provider = data.provider;
    const site = data.site;
    const platform = data.platform;
    const building = data.building || null;
    const room = data.room || null;

    if (!provider && !site && !platform && !building && !room) {
      return undefined;
    }

    const existing = await this.prisma.hostingOption.findFirst({
      where: { provider, site, platform, building, room },
      select: { id: true },
    });
    if (existing) return existing.id;

    // Création d'une option : mêmes contrôles que l'API (site/plateforme/fournisseur requis).
    const optionDto = plainToInstance(CreateHostingOptionDto, {
      provider,
      site,
      platform,
      ...(building && { building }),
      ...(room && { room }),
    });
    await this.validateDto(optionDto);
    const created = await this.prisma.hostingOption.create({
      data: { provider, site, platform, building, room },
      select: { id: true },
    });
    return created.id;
  }

  private identifierOf(data: {
    id: string;
    label: string;
    provider: string;
    site: string;
  }): string | undefined {
    if (data.label) return data.label;
    if (data.provider && data.site) return `${data.provider} (${data.site})`;
    return data.provider || data.site || data.id || undefined;
  }

  private async validateDto(
    dto: CreateHostingDto | UpdateHostingDto | CreateHostingOptionDto,
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
