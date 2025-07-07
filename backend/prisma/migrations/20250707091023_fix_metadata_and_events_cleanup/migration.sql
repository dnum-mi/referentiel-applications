-- Nettoyage résiduel dû à migration interrompue
ALTER TABLE "metadata" DROP CONSTRAINT IF EXISTS "metadata_eventId_fkey";
DROP TABLE IF EXISTS "events";
DROP TYPE IF EXISTS "EventType";