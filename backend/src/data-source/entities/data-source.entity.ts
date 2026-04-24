export class DataSource {
  id: string;
  name: string;
  description?: string;
  isReference: boolean;
  example?: string;
  conservation?: string;
  databaseName?: string;
  databaseTableName?: string;
  fieldCount?: number;
  fields?: string;
  volumetry?: number;
  monthlyVolumetry?: number;
  applicationId: string;
  typeId?: string;
  sensibilityId?: string;
  familyId?: string;
  updateFrequencyId?: string;
}
