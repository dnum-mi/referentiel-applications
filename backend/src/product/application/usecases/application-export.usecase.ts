import { Injectable } from "@nestjs/common";
import { ApplicationRepository } from "../../infrastructure/repository/application.repository";
import { columnLabels } from "../../columnLabels/application-export.columnLabels";
import {
  mapActors,
  mapAnomalyNotifications,
  mapApplications,
  mapCompliances,
  mapExternalResources,
  mapHostings,
  mapLabels,
  mapRelationsIn,
  mapRelationsOut,
} from "../map/application-export.map";
import { ExcelBuilderService } from "src/common/service/excel-builder.service";
import { ensureSheetHasAtLeastOneRow } from "src/common/utils/excel.utils";
import { sheetLabels } from "src/product/constants/application-export.sheet-labels";
import { ApplicationWithAllRelations } from "src/product/types/application.type";

@Injectable()
export class ExportApplicationsUseCase {
  constructor(
    private readonly repository: ApplicationRepository,
    private readonly excelBuilder: ExcelBuilderService,
  ) {}

  async execute(): Promise<Buffer> {
    const apps = await this.repository.findAllWithRelations();
    return this.executeWithApps(apps);
  }

  async executeWithApps(apps: ApplicationWithAllRelations[]): Promise<Buffer> {
    const sheets = [
      {
        name: sheetLabels.Applications,
        columns: [
          { header: columnLabels.id, key: "id", width: 30 },
          { header: columnLabels.label, key: "label", width: 40 },
          { header: columnLabels.shortName, key: "shortName", width: 30 },
          { header: columnLabels.logo, key: "logo", width: 40 },
          {
            header: columnLabels.description,
            key: "description",
            width: 50,
          },
          { header: columnLabels.tags, key: "tags", width: 30 },
          { header: columnLabels.purposes, key: "purposes", width: 30 },
          {
            header: columnLabels.targetPopulations,
            key: "targetPopulations",
            width: 30,
          },
          {
            header: columnLabels.priorityRestart,
            key: "priorityRestart",
            width: 20,
          },
        ],
        rows: mapApplications(apps),
      },
      {
        name: sheetLabels.Hostings,
        columns: [
          { header: "ID Application", key: "applicationId", width: 30 },
          { header: "Application", key: "applicationLabel", width: 30 },
          {
            header: columnLabels["hostings.provider"],
            key: "provider",
            width: 30,
          },
          { header: columnLabels["hostings.region"], key: "region", width: 25 },
          { header: columnLabels["hostings.site"], key: "site", width: 25 },
          { header: columnLabels["hostings.nature"], key: "nature", width: 20 },
          {
            header: columnLabels["hostings.platform"],
            key: "platform",
            width: 25,
          },
        ],
        rows: ensureSheetHasAtLeastOneRow(apps.flatMap(mapHostings), {
          applicationId: "",
          applicationLabel: "Aucune application",
          label: "",
          provider: "Aucun hébergement",
          site: "",
          platform: "",
          building: "",
          room: "",
        }),
      },
      {
        name: sheetLabels.Actors,
        columns: [
          { header: "ID Application", key: "applicationId", width: 30 },
          { header: "Application", key: "applicationLabel", width: 30 },
          {
            header: columnLabels["actors.firstname"],
            key: "firstname",
            width: 25,
          },
          {
            header: columnLabels["actors.lastname"],
            key: "lastname",
            width: 25,
          },
          { header: columnLabels["actors.role"], key: "role", width: 30 },
          { header: columnLabels["actors.type"], key: "type", width: 25 },
          { header: columnLabels["actors.email"], key: "email", width: 35 },
        ],
        rows: ensureSheetHasAtLeastOneRow(apps.flatMap(mapActors), {
          applicationId: "",
          applicationLabel: "Aucune application",
          firstname: "Aucun acteur",
          lastname: "",
          type: "",
          email: "",
        }),
      },
      {
        name: sheetLabels.Compliances,
        columns: [
          { header: "ID Application", key: "applicationId", width: 30 },
          { header: "Application", key: "applicationLabel", width: 30 },
          { header: "ID Conformité", key: "id", width: 30 },
          // DIMA fields
          {
            header: "DIMA Durée (heures)",
            key: "dima_duration_hours",
            width: 20,
          },
          { header: "DIMA HNO", key: "dima_is_hno", width: 15 },
          {
            header: "DIMA Impact métier",
            key: "dima_business_impact",
            width: 30,
          },
          {
            header: "DIMA Plan de reprise",
            key: "dima_recovery_plan",
            width: 20,
          },
          {
            header: "DIMA Solutions de reprise",
            key: "dima_recovery_solutions",
            width: 30,
          },
          {
            header: "DIMA Date dernier test",
            key: "dima_last_test_date",
            width: 20,
          },
          { header: "DIMA Résultat test", key: "dima_test_result", width: 20 },
          {
            header: "DIMA Responsable reprise",
            key: "dima_recovery_manager",
            width: 25,
          },
          // PDMA fields
          {
            header: "PDMA Durée (heures)",
            key: "pdma_duration_hours",
            width: 20,
          },
          {
            header: "PDMA Types de données",
            key: "pdma_data_types",
            width: 30,
          },
          {
            header: "PDMA Fréquence sauvegarde",
            key: "pdma_backup_frequency",
            width: 25,
          },
          {
            header: "PDMA Méthode sauvegarde",
            key: "pdma_backup_method",
            width: 25,
          },
          {
            header: "PDMA Stockage sauvegarde",
            key: "pdma_backup_storage",
            width: 25,
          },
          {
            header: "PDMA Date dernier test",
            key: "pdma_last_test_date",
            width: 20,
          },
          { header: "PDMA Résultat test", key: "pdma_test_result", width: 20 },
          {
            header: "PDMA Responsable restauration",
            key: "pdma_restoration_manager",
            width: 25,
          },
          // HOMOLOGATION fields
          { header: "Homologation Date Fin", key: "homologation_date_end", width: 20 },
          {
            header: "Homologation RSSI ID",
            key: "homologation_rssi_id",
            width: 25,
          },
          // RGAA fields
          { header: "RGAA Date audit", key: "rgaa_audit_date", width: 20 },
          { header: "RGAA URL service", key: "rgaa_service_url", width: 30 },
          {
            header: "RGAA URL accessibilité",
            key: "rgaa_accessibility_url",
            width: 30,
          },
          { header: "RGAA Score (%)", key: "rgaa_score_percentage", width: 15 },
          // DSFR fields
          { header: "DSFR Implémenté", key: "dsfr_implemented", width: 15 },
          { header: "DSFR Version", key: "dsfr_version", width: 15 },
          // RGPD fields
          { header: "RGPD AIPD", key: "rgpd_has_aipd", width: 15 },
          { header: "RGPD Nom DPO", key: "rgpd_dpo_name", width: 25 },
        ],
        rows: ensureSheetHasAtLeastOneRow(apps.flatMap(mapCompliances), {
          applicationId: "",
          applicationLabel: "Aucune application",
          id: "",
          dima_duration_hours: null,
          dima_is_hno: null,
          dima_business_impact: null,
          dima_recovery_plan: null,
          dima_recovery_solutions: null,
          dima_last_test_date: null,
          dima_test_result: null,
          dima_recovery_manager: null,
          pdma_duration_hours: null,
          pdma_data_types: null,
          pdma_backup_frequency: null,
          pdma_backup_method: null,
          pdma_backup_storage: null,
          pdma_last_test_date: null,
          pdma_test_result: null,
          pdma_restoration_manager: null,
          homologation_date_end: null,
          homologation_rssi_id: null,
          rgaa_audit_date: null,
          rgaa_service_url: null,
          rgaa_accessibility_url: null,
          rgaa_score_percentage: null,
          dsfr_implemented: null,
          dsfr_version: null,
          rgpd_has_aipd: null,
          rgpd_dpo_name: null,
        }),
      },
      {
        name: sheetLabels.Labels,
        columns: [
          { header: "ID Application", key: "applicationId", width: 30 },
          { header: "Application", key: "applicationLabel", width: 30 },
          { header: columnLabels["labels.value"], key: "value", width: 30 },
          { header: columnLabels["labels.source"], key: "source", width: 30 },
        ],
        rows: ensureSheetHasAtLeastOneRow(apps.flatMap(mapLabels), {
          applicationId: "",
          applicationLabel: "Aucune application",
          value: "Aucun nom alternatif",
          source: "",
        }),
      },
      {
        name: sheetLabels.ExternalResources,
        columns: [
          { header: "ID Application", key: "applicationId", width: 30 },
          { header: "Application", key: "applicationLabel", width: 30 },
          {
            header: columnLabels["externalRessource.link"],
            key: "link",
            width: 40,
          },
          {
            header: columnLabels["externalRessource.description"],
            key: "description",
            width: 40,
          },
          {
            header: columnLabels["externalRessource.type"],
            key: "type",
            width: 20,
          },
        ],
        rows: ensureSheetHasAtLeastOneRow(apps.flatMap(mapExternalResources), {
          applicationId: "",
          applicationLabel: "Aucune application",
          link: "Aucune ressource externe",
          description: "",
          type: "",
        }),
      },
      {
        name: sheetLabels.AnomalyNotifications,
        columns: [
          { header: "ID Application", key: "applicationId", width: 30 },
          { header: "Application", key: "applicationLabel", width: 30 },
          {
            header: columnLabels["anomalyNotification.description"],
            key: "description",
            width: 40,
          },
          {
            header: columnLabels["anomalyNotification.status"],
            key: "status",
            width: 20,
          },
        ],
        rows: ensureSheetHasAtLeastOneRow(
          apps.flatMap(mapAnomalyNotifications),
          {
            applicationId: "",
            applicationLabel: "Aucune application",
            description: "Aucune notification",
            status: "",
          },
        ),
      },
      {
        name: sheetLabels.RelationsAsTarget,
        columns: [
          { header: "ID Application", key: "applicationId", width: 30 },
          { header: "Application", key: "applicationLabel", width: 30 },
          { header: "Source ID", key: "sourceId", width: 30 },
          { header: "Target ID", key: "targetId", width: 30 },
          {
            header: columnLabels["relationsAsSource.targetApplication.label"],
            key: "targetLabel",
            width: 40,
          },
          { header: "Relation Type", key: "type", width: 30 },
        ],
        rows: ensureSheetHasAtLeastOneRow(apps.flatMap(mapRelationsOut), {
          applicationId: "",
          applicationLabel: "Aucune application",
          sourceId: "",
          targetId: "",
          targetLabel: "Aucune relation sortante",
          type: "",
        }),
      },
      {
        name: sheetLabels.RelationsAsSource,
        columns: [
          { header: "ID Application", key: "applicationId", width: 30 },
          { header: "Application", key: "applicationLabel", width: 30 },
          { header: "Target ID", key: "targetId", width: 30 },
          { header: "Source ID", key: "sourceId", width: 30 },
          {
            header: columnLabels["relationsAsTarget.sourceApplication.label"],
            key: "sourceLabel",
            width: 40,
          },
          { header: "Relation Type", key: "type", width: 30 },
        ],
        rows: ensureSheetHasAtLeastOneRow(apps.flatMap(mapRelationsIn), {
          applicationId: "",
          applicationLabel: "Aucune application",
          targetId: "",
          sourceId: "",
          sourceLabel: "Aucune relation entrante",
          type: "",
        }),
      },
    ];

    return this.excelBuilder.buildWorkbook(sheets);
  }
}
