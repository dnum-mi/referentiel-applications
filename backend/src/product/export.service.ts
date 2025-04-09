import { ExportApplicationsUseCase } from './application/usecases/application-export.usecase';
import { Injectable } from '@nestjs/common';
import { ApplicationRepository } from './infrastructure/repository/application.repository';
import { ApplicationWithAllRelations } from './types/application.type';
import { getFullField } from './application/map/application-export.map';
import { columnLabels } from './columnLabels/application-export.columnLabels';

@Injectable()
export class ApplicationExportService {
  constructor(
    private readonly repository: ApplicationRepository,
    private readonly exportApplicationsUseCase: ExportApplicationsUseCase,
  ) {}

  async exportApplicationsToExcel(): Promise<Buffer> {
    return this.exportApplicationsUseCase.execute();
  }

  async exportApplications(
    columns: string[],
    filters?: Record<string, string>,
  ): Promise<{ fileName: string; csv: string }> {
    const apps = await this.repository.findAllWithRelations();
    const filteredApps = this.applyFilters(apps, filters);
    return this.generateExportCsv(filteredApps, columns);
  }

  private applyFilters(
    apps: ApplicationWithAllRelations[],
    filters?: Record<string, string>,
  ): ApplicationWithAllRelations[] {
    if (!filters) return apps;

    return apps.filter((app) => {
      return Object.entries(filters).every(([field, rawValues]) => {
        const values = rawValues.split(',').map((v) => v.trim().toLowerCase());
        const actualValue = getFullField(app, field)?.toLowerCase() ?? '';
        return values.some((val) => actualValue.includes(val));
      });
    });
  }

  public generateCsv(
    data: Record<string, string>[],
    fields: string[],
    headers: string[],
  ): string {
    const csvRows = [headers.join(',')];

    data.forEach((row) => {
      const rowData = fields.map((field) => {
        const value = row[field] ?? '';
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(rowData.join(','));
    });

    return csvRows.join('\n');
  }

  private generateExportCsv(
    apps: ApplicationWithAllRelations[],
    columns: string[],
  ): { fileName: string; csv: string } {
    const defaultColumns = ['id', 'label', 'description'];
    const allowedPrefixes = [
      'id',
      'label',
      'shortName',
      'logo',
      'description',
      'priorityRestart',
      'tags',
      'purposes',
      'targetPopulations',
      'compliances',
      'labels',
      'actors',
      'relationsAsSource',
      'relationsAsTarget',
      'events',
      'hostings',
      'externalRessource',
      'anomalyNotification',
    ];

    const columnArray = Array.isArray(columns) ? columns : [columns];
    const allRequested = columnArray.length ? columnArray : defaultColumns;

    const selected = allRequested
      .filter((c): c is string => typeof c === 'string')
      .filter((c) =>
        allowedPrefixes.some(
          (prefix) => c === prefix || c.startsWith(prefix + '.'),
        ),
      );

    const ignored = allRequested.filter((c) => !selected.includes(c));
    if (ignored.length > 0) {
      console.warn('Colonnes ignorées :', ignored);
    }

    const data = apps.map((app) => {
      const row: Record<string, string> = {};
      for (const col of selected) {
        row[col] = getFullField(app, col);
      }
      return row;
    });

    const csvHeaders = selected.map((field) => columnLabels[field] ?? field);
    const csv = this.generateCsv(data, selected, csvHeaders);

    const date = new Date().toISOString().split('T')[0];

    const safeLabelParts = csvHeaders
      .map((label) =>
        label
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\W+/g, '_')
          .replace(/^_+|_+$/g, ''),
      )
      .slice(0, 5);

    const colsPart =
      selected.length <= 4
        ? safeLabelParts.join('_')
        : `${selected.length}_colonnes`;

    const fileName = `referentiel_application_${colsPart}_${date}.csv`;

    return { fileName, csv };
  }
}
