export interface TechnicalDebtPoint {
  id: string;
  applicationId: string;
  applicationLabel: string;
  applicationShortName?: string | null;
  technicalMaturity?: number | null;
  businessMaturity?: number | null;
  costMaturity?: number | null;
}
