import { Injectable } from '@nestjs/common';
import { ApplicationRepository } from '../../infrastructure/repository/application.repository';
import { columnLabels } from '../../columnLabels/application-export.columnLabels';
import {
  mapActors,
  mapAnomalyNotifications,
  mapApplications,
  mapCompliances,
  mapEvents,
  mapExternalResources,
  mapHostings,
  mapLabels,
  mapRelationsIn,
  mapRelationsOut,
} from '../map/application-export.map';
import { ExcelBuilderService } from 'src/common/service/excel-builder.service';
import { ensureSheetHasAtLeastOneRow } from 'src/common/utils/excel.utils';
import { sheetLabels } from 'src/product/constants/application-export.sheet-labels';

@Injectable()
export class ExportApplicationsUseCase {
  constructor(
    private readonly repository: ApplicationRepository,
    private readonly excelBuilder: ExcelBuilderService,
  ) {}

  async execute(): Promise<Buffer> {
    const apps = await this.repository.findAllWithRelations();

    const sheets = [
      {
        name: sheetLabels.Applications,
        columns: [
          { header: columnLabels['id'], key: 'id', width: 30 },
          { header: columnLabels['label'], key: 'label', width: 40 },
          { header: columnLabels['shortName'], key: 'shortName', width: 30 },
          { header: columnLabels['logo'], key: 'logo', width: 40 },
          {
            header: columnLabels['description'],
            key: 'description',
            width: 50,
          },
          { header: columnLabels['tags'], key: 'tags', width: 30 },
          { header: columnLabels['purposes'], key: 'purposes', width: 30 },
          {
            header: columnLabels['targetPopulations'],
            key: 'targetPopulations',
            width: 30,
          },
          {
            header: columnLabels['priorityRestart'],
            key: 'priorityRestart',
            width: 20,
          },
        ],
        rows: mapApplications(apps),
      },
      {
        name: sheetLabels.Hostings,
        columns: [
          { header: 'ID Application', key: 'applicationId', width: 30 },
          { header: 'Application', key: 'applicationLabel', width: 30 },
          {
            header: columnLabels['hostings.provider'],
            key: 'provider',
            width: 30,
          },
          { header: columnLabels['hostings.region'], key: 'region', width: 25 },
          { header: columnLabels['hostings.site'], key: 'site', width: 25 },
          { header: columnLabels['hostings.nature'], key: 'nature', width: 20 },
          {
            header: columnLabels['hostings.platform'],
            key: 'platform',
            width: 25,
          },
        ],
        rows: ensureSheetHasAtLeastOneRow(apps.flatMap(mapHostings), {
          applicationId: '',
          applicationLabel: 'Aucune application',
          provider: 'Aucun hébergement',
          region: '',
          site: '',
          nature: '',
          platform: '',
        }),
      },
      {
        name: sheetLabels.Actors,
        columns: [
          { header: 'ID Application', key: 'applicationId', width: 30 },
          { header: 'Application', key: 'applicationLabel', width: 30 },
          {
            header: columnLabels['actors.firstname'],
            key: 'firstname',
            width: 25,
          },
          {
            header: columnLabels['actors.lastname'],
            key: 'lastname',
            width: 25,
          },
          { header: columnLabels['actors.role'], key: 'role', width: 30 },
          { header: columnLabels['actors.type'], key: 'type', width: 25 },
          { header: columnLabels['actors.email'], key: 'email', width: 35 },
        ],
        rows: ensureSheetHasAtLeastOneRow(apps.flatMap(mapActors), {
          applicationId: '',
          applicationLabel: 'Aucune application',
          firstname: 'Aucun acteur',
          lastname: '',
          role: '',
          type: '',
          email: '',
        }),
      },
      {
        name: sheetLabels.Compliances,
        columns: [
          { header: 'ID Application', key: 'applicationId', width: 30 },
          { header: 'Application', key: 'applicationLabel', width: 30 },
          { header: columnLabels['compliances.type'], key: 'type', width: 20 },
          { header: columnLabels['compliances.name'], key: 'name', width: 30 },
          {
            header: columnLabels['compliances.status'],
            key: 'status',
            width: 20,
          },
          {
            header: columnLabels['compliances.validityStart'],
            key: 'validityStart',
            width: 20,
          },
          {
            header: columnLabels['compliances.validityEnd'],
            key: 'validityEnd',
            width: 20,
          },
        ],
        rows: ensureSheetHasAtLeastOneRow(apps.flatMap(mapCompliances), {
          applicationId: '',
          applicationLabel: 'Aucune application',
          type: 'Aucune conformité',
          name: '',
          status: '',
          validityStart: '',
          validityEnd: '',
        }),
      },
      {
        name: sheetLabels.Labels,
        columns: [
          { header: 'ID Application', key: 'applicationId', width: 30 },
          { header: 'Application', key: 'applicationLabel', width: 30 },
          { header: columnLabels['labels.value'], key: 'value', width: 30 },
          { header: columnLabels['labels.source'], key: 'source', width: 30 },
          {
            header: columnLabels['labels.shortname'],
            key: 'shortname',
            width: 30,
          },
        ],
        rows: ensureSheetHasAtLeastOneRow(apps.flatMap(mapLabels), {
          applicationId: '',
          applicationLabel: 'Aucune application',
          value: 'Aucun label',
          source: '',
          shortname: '',
        }),
      },
      {
        name: sheetLabels.Events,
        columns: [
          { header: 'ID Application', key: 'applicationId', width: 30 },
          { header: 'Application', key: 'applicationLabel', width: 30 },
          { header: columnLabels['events.type'], key: 'type', width: 25 },
          { header: columnLabels['events.start'], key: 'start', width: 20 },
          { header: columnLabels['events.end'], key: 'end', width: 20 },
          {
            header: columnLabels['events.description'],
            key: 'description',
            width: 40,
          },
        ],
        rows: ensureSheetHasAtLeastOneRow(apps.flatMap(mapEvents), {
          applicationId: '',
          applicationLabel: 'Aucune application',
          type: 'Aucun événement',
          start: '',
          end: '',
          description: '',
        }),
      },
      {
        name: sheetLabels.ExternalResources,
        columns: [
          { header: 'ID Application', key: 'applicationId', width: 30 },
          { header: 'Application', key: 'applicationLabel', width: 30 },
          {
            header: columnLabels['externalRessource.link'],
            key: 'link',
            width: 40,
          },
          {
            header: columnLabels['externalRessource.description'],
            key: 'description',
            width: 40,
          },
          {
            header: columnLabels['externalRessource.type'],
            key: 'type',
            width: 20,
          },
        ],
        rows: ensureSheetHasAtLeastOneRow(apps.flatMap(mapExternalResources), {
          applicationId: '',
          applicationLabel: 'Aucune application',
          link: 'Aucune ressource externe',
          description: '',
          type: '',
        }),
      },
      {
        name: sheetLabels.AnomalyNotifications,
        columns: [
          { header: 'ID Application', key: 'applicationId', width: 30 },
          { header: 'Application', key: 'applicationLabel', width: 30 },
          {
            header: columnLabels['anomalyNotification.description'],
            key: 'description',
            width: 40,
          },
          {
            header: columnLabels['anomalyNotification.status'],
            key: 'status',
            width: 20,
          },
        ],
        rows: ensureSheetHasAtLeastOneRow(
          apps.flatMap(mapAnomalyNotifications),
          {
            applicationId: '',
            applicationLabel: 'Aucune application',
            description: 'Aucune notification',
            status: '',
          },
        ),
      },
      {
        name: sheetLabels.RelationsAsTarget,
        columns: [
          { header: 'ID Application', key: 'applicationId', width: 30 },
          { header: 'Application', key: 'applicationLabel', width: 30 },
          { header: 'Source ID', key: 'sourceId', width: 30 },
          { header: 'Target ID', key: 'targetId', width: 30 },
          {
            header: columnLabels['relationsAsSource.targetApplication.label'],
            key: 'targetLabel',
            width: 40,
          },
          { header: 'Relation Type', key: 'type', width: 30 },
        ],
        rows: ensureSheetHasAtLeastOneRow(apps.flatMap(mapRelationsOut), {
          applicationId: '',
          applicationLabel: 'Aucune application',
          sourceId: '',
          targetId: '',
          targetLabel: 'Aucune relation sortante',
          type: '',
        }),
      },
      {
        name: sheetLabels.RelationsAsSource,
        columns: [
          { header: 'ID Application', key: 'applicationId', width: 30 },
          { header: 'Application', key: 'applicationLabel', width: 30 },
          { header: 'Target ID', key: 'targetId', width: 30 },
          { header: 'Source ID', key: 'sourceId', width: 30 },
          {
            header: columnLabels['relationsAsTarget.sourceApplication.label'],
            key: 'sourceLabel',
            width: 40,
          },
          { header: 'Relation Type', key: 'type', width: 30 },
        ],
        rows: ensureSheetHasAtLeastOneRow(apps.flatMap(mapRelationsIn), {
          applicationId: '',
          applicationLabel: 'Aucune application',
          targetId: '',
          sourceId: '',
          sourceLabel: 'Aucune relation entrante',
          type: '',
        }),
      },
    ];

    return this.excelBuilder.buildWorkbook(sheets);
  }
}
