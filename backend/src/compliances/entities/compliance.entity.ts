import type { BackupStorage, TestResult } from "src/enum";

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
  homologation_date_end?: Date;
  homologation_rssi_id?: string;
  homologation_status?: string;

  // DSFR specific fields
  dsfr_implemented?: boolean;
  dsfr_version?: string;

  // RGPD specific fields
  rgpd_has_aipd?: boolean;
  rgpd_dpo_name?: string;

  // EcoIndex fields
  eco_index_score?: number;
  eco_index_ges?: number;
  eco_index_water?: number;
  eco_index_target_url?: string;
  eco_index_last_calculated_at?: Date;
}
