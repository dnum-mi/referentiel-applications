-- #2542 : la contrainte héritée de AnomalyNotificationHistory était en ON DELETE RESTRICT ;
-- elle bloquait la cascade Application → Report et faisait échouer la suppression d'une
-- application dont un signalement possède un historique.

-- DropForeignKey
ALTER TABLE "ReportHistory" DROP CONSTRAINT "ReportHistory_reportId_fkey";

-- AddForeignKey
ALTER TABLE "ReportHistory" ADD CONSTRAINT "ReportHistory_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
