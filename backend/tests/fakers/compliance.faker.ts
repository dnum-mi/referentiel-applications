import type { Prisma } from "@prisma/client";
import { BackupStorage, HomologationStatus } from "@prisma/client";
import { getPrismaClient } from "./prisma";

type ComplianceSeedData = Omit<
  Prisma.ComplianceUncheckedCreateInput,
  "applicationId"
>;

const prisma = getPrismaClient();

const complianceSeeds: ComplianceSeedData[] = [
  {
    dima_duration_hours: 1,
    dima_is_hno: false,
    dima_business_impact: "Impact faible sur le service et les usagers",
    dima_recovery_plan: false,
  },
  {
    dima_duration_hours: 24,
    dima_is_hno: true,
    dima_business_impact: "Interruption visible pour les partenaires externes",
    dima_recovery_plan: true,
    dima_recovery_solutions: "Bascule vers infrastructure secondaire",
    dima_last_test_date: new Date("2025-02-20T22:00:00.000Z"),
    dima_test_result: "KO",
    dima_recovery_manager: "Cellule Continuit\u00e9 de service",
  },
  {
    dima_duration_hours: 72,
    dima_is_hno: true,
    dima_business_impact: "Arret majeur avec impact metier critique",
    dima_recovery_plan: true,
    dima_recovery_solutions: "PRA complet sur site de secours",
    dima_last_test_date: new Date("2024-12-05T08:30:00.000Z"),
    dima_test_result: "OK",
    dima_recovery_manager: "Responsable Production",
  },

  {
    pdma_duration_hours: 2,
    pdma_data_types: "Transactions critiques, journaux de securite",
    pdma_backup_frequency: "Horaire",
    pdma_backup_method: "Snapshots incrementaux",
    pdma_backup_storage: BackupStorage.S3,
    pdma_last_test_date: new Date("2025-01-10T03:00:00.000Z"),
    pdma_test_result: "OK",
    pdma_restoration_manager: "Equipe Sauvegarde",
  },
  {
    pdma_duration_hours: 24,
    pdma_data_types: "Documents metier et pieces jointes",
    pdma_backup_frequency: "Quotidienne",
    pdma_backup_method: "Sauvegarde complete nocturne",
    pdma_backup_storage: BackupStorage.LOCAL,
    pdma_last_test_date: new Date("2025-02-14T01:30:00.000Z"),
    pdma_test_result: "OK",
    pdma_restoration_manager: "Administrateur Systeme",
  },
  {
    pdma_duration_hours: 48,
    pdma_data_types: "Archives et traces historiques",
    pdma_backup_frequency: "Hebdomadaire",
    pdma_backup_method: "Export chiffree sur coffre-fort numerique",
    pdma_backup_storage: BackupStorage.EXTERNE,
    pdma_last_test_date: new Date("2024-11-22T06:00:00.000Z"),
    pdma_test_result: "KO",
    pdma_restoration_manager: "Prestataire Infogerance",
  },

  {
    homologation_status: HomologationStatus.en_cours,
  },
  {
    homologation_status: HomologationStatus.homologuee,
    homologation_date_end: new Date("2027-12-31T00:00:00.000Z"),
  },
  {
    homologation_status: HomologationStatus.dispensee,
  },

  { dsfr_implemented: true, dsfr_version: "1.12.1" },
  { dsfr_implemented: false },
  { dsfr_implemented: true, dsfr_version: "1.13.0" },

  { rgpd_has_aipd: true, rgpd_dpo_name: "DPO 1" },
  { rgpd_has_aipd: false, rgpd_dpo_name: "DPO 2" },
  { rgpd_has_aipd: true, rgpd_dpo_name: "DPO 3" },
];

export class ComplianceFaker {
  static async create(override: { application: { id: string } }) {
    const { application } = override;
    const randomIndex = Math.floor(Math.random() * complianceSeeds.length);
    const compliance = complianceSeeds[randomIndex];

    return await prisma.compliance.create({
      data: {
        applicationId: application.id,
        ...compliance,
      },
    });
  }
}
