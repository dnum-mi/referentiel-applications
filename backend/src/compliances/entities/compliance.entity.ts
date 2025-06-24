import { ComplianceStatus, ComplianceType } from 'src/enum';

export class Compliance {
  id: string;
  type: ComplianceType;
  name: string;
  status: ComplianceStatus;
  validityStart?: Date;
  validityEnd?: Date;
  scoreValue?: string;
  scoreUnit?: string;
  notes?: string;
  applicationId?: string;
}
