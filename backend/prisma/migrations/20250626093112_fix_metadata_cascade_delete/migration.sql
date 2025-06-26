-- Drop the existing foreign key constraint with RESTRICT
ALTER TABLE "metadata" DROP CONSTRAINT "metadata_applicationId_fkey";

-- Add the foreign key constraint with CASCADE delete
ALTER TABLE "metadata" ADD CONSTRAINT "metadata_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;