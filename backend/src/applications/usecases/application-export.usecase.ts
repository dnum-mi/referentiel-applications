import { Injectable } from "@nestjs/common";
import { ExcelBuilderService } from "src/common/service/excel-builder.service";
import { sheetLabels } from "src/applications/constants/application-export.sheet-labels";
import { ApplicationWithAllRelations } from "src/applications/types/application.type";
import { columnLabels } from "src/applications/columnLabels/application-export.columnLabels";
import { ApplicationRepository } from "src/applications/infrastructure/repository/application.repository";
import {
  mapActors,
  mapReports,
  mapApplications,
  mapCompliances,
  mapExternalResources,
  mapHostings,
  mapLabels,
  mapRelationsIn,
  mapRelationsOut,
  mapStatuses,
} from "../map/application-export.map";

@Injectable()
export class ExportApplicationsUseCase {
  constructor(
    private readonly repository: ApplicationRepository,
    private readonly excelBuilder: ExcelBuilderService,
  ) {}

  async execute(): Promise<Buffer> {
    const apps = await this.repository.findAllWithFullRelations();
    return this.executeWithApps(apps);
  }

  async executeWithApps(apps: ApplicationWithAllRelations[]): Promise<Buffer> {
    const col = (key: string, width: number) => ({
      header: columnLabels[key],
      key,
      width,
    });

    const sheets = [
      {
        name: sheetLabels.Applications,
        columns: [
          col("id", 30),
          col("label", 40),
          col("shortName", 30),
          col("logo", 40),
          col("description", 50),
          col("tags", 30),
          col("purposes", 30),
          col("targetPopulations", 30),
          col("priorityRestart", 20),
          col("currentStatusId", 30),
        ],
        rows: mapApplications(apps),
      },
      {
        name: sheetLabels.Hostings,
        columns: [
          col("applicationId", 30),
          col("applicationLabel", 30),
          col("hostings.label", 30),
          col("hostings.provider", 30),
          col("hostings.site", 25),
          col("hostings.platform", 25),
          col("hostings.building", 25),
          col("hostings.room", 20),
        ],
        rows: apps.flatMap(mapHostings),
      },
      {
        name: sheetLabels.Actors,
        columns: [
          col("applicationId", 30),
          col("applicationLabel", 30),
          col("actors.firstname", 25),
          col("actors.lastname", 25),
          col("actors.role", 30),
          col("actors.type", 25),
          col("actors.email", 35),
        ],
        rows: apps.flatMap(mapActors),
      },
      {
        name: sheetLabels.Compliances,
        columns: [
          col("applicationId", 30),
          col("applicationLabel", 30),
          col("id", 30),
          // DIMA fields
          col("dima_duration_hours", 20),
          col("dima_is_hno", 15),
          col("dima_business_impact", 30),
          col("dima_recovery_plan", 20),
          col("dima_recovery_solutions", 30),
          col("dima_last_test_date", 20),
          col("dima_test_result", 20),
          col("dima_recovery_manager", 25),
          // PDMA fields
          col("pdma_duration_hours", 20),
          col("pdma_data_types", 30),
          col("pdma_backup_frequency", 25),
          col("pdma_backup_method", 25),
          col("pdma_backup_storage", 25),
          col("pdma_last_test_date", 20),
          col("pdma_test_result", 20),
          col("pdma_restoration_manager", 25),
          // HOMOLOGATION fields
          col("homologation_date_end", 20),
          col("homologation_rssi_id", 25),
          // DSFR fields
          col("dsfr_implemented", 15),
          col("dsfr_version", 15),
          // RGPD fields
          col("rgpd_has_aipd", 15),
          col("rgpd_dpo_name", 25),
        ],
        rows: apps.flatMap(mapCompliances),
      },
      {
        name: sheetLabels.Labels,
        columns: [
          col("applicationId", 30),
          col("applicationLabel", 30),
          col("labels.value", 30),
          col("labels.labelSource.source", 30),
        ],
        rows: apps.flatMap(mapLabels),
      },
      {
        name: sheetLabels.ExternalResources,
        columns: [
          col("applicationId", 30),
          col("applicationLabel", 30),
          col("externalRessource.link", 40),
          col("externalRessource.description", 40),
          col("externalRessource.type", 20),
        ],
        rows: apps.flatMap(mapExternalResources),
      },
      {
        name: sheetLabels.Reports,
        columns: [
          col("applicationId", 30),
          col("applicationLabel", 30),
          col("report.description", 40),
          col("report.status", 20),
        ],
        rows: apps.flatMap(mapReports),
      },
      {
        name: sheetLabels.RelationsAsTarget,
        columns: [
          col("applicationId", 30),
          col("applicationLabel", 30),
          col("sourceId", 30),
          col("targetId", 30),
          col("relationsAsSource.targetApplication.label", 40),
          col("type", 30),
        ],
        rows: apps.flatMap(mapRelationsOut),
      },
      {
        name: sheetLabels.RelationsAsSource,
        columns: [
          col("applicationId", 30),
          col("applicationLabel", 30),
          col("targetId", 30),
          col("sourceId", 30),
          col("relationsAsTarget.sourceApplication.label", 40),
          col("type", 30),
        ],
        rows: apps.flatMap(mapRelationsIn),
      },
      {
        name: sheetLabels.Statuses,
        columns: [
          col("applicationId", 30),
          col("applicationLabel", 40),
          col("status", 30),
          col("statusDate", 20),
        ],
        rows: apps.flatMap(mapStatuses),
      },
    ];

    return this.excelBuilder.buildWorkbook(sheets);
  }
}
