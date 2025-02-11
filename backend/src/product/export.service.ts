import { Injectable } from '@nestjs/common';

@Injectable()
export class ExportService {
  public generateCsv(
    data: Record<string, string>[],
    headers: string[],
  ): string {
    const csvRows = [headers.join(',')];
    data.forEach((row) => {
      const rowData = headers.map((header) => (row[header] ? row[header] : ''));
      csvRows.push(rowData.join(','));
    });
    return csvRows.join('\n');
  }
}
