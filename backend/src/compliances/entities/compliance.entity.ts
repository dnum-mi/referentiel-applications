import type { TestResult, BackupStorage } from "src/enum";

export class Compliance {
  id: string;
  applicationId?: string;

  // DIMA specific fields
  dima_duration_hours?: number;
  dima_is_hno?: boolean;
  dima_business_impact?: string;
  dima_recovery_plan?: boolean;
  dima_recovery_solutions?: string;
  dima_last_test_date?: Date;
  dima_test_result?: TestResult;
  dima_recovery_manager?: string;

  // PDMA specific fields
  pdma_duration_hours?: number;
  pdma_data_types?: string;
  pdma_backup_frequency?: string;
  pdma_backup_method?: string;
  pdma_backup_storage?: BackupStorage;
  pdma_last_test_date?: Date;
  pdma_test_result?: TestResult;
  pdma_restoration_manager?: string;

  // Homologation specific fields
  homologation_date?: Date;
  homologation_duration_months?: number;
  homologation_rssi_id?: string;

  // RGAA specific fields
  rgaa_audit_date?: Date;
  rgaa_service_url?: string;
  rgaa_accessibility_url?: string;
  rgaa_score_percentage?: number;

  // DSFR specific fields
  dsfr_implemented?: boolean;
  dsfr_version?: string;

  // RGPD specific fields
  rgpd_has_aipd?: boolean;
  rgpd_dpo_name?: string;
}
