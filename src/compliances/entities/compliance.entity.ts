export enum AppComplianceLevel {
  Dispens_e = 'Dispens_e',
  Non_pass_e = 'Non_pass_e',
  Partielle = 'Partielle',
  Compl_te = 'Compl_te',
  Obsol_te = 'Obsol_te',
}
export class Compliance {
  createdby: string;
  createdat: Date;
  updatedby: string;
  updatedat: Date;
  comments: string | null;
  applicationid: string;
  compliancetype: string;
  compliancelevel: AppComplianceLevel;
  decisiondate: Date | null;
  validitydate: Date | null;
  auditdate: Date | null;
  description: string | null;
}
