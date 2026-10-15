-- DropForeignKey
ALTER TABLE "Actor" DROP CONSTRAINT "Actor_actorTypeId_fkey";

-- AddForeignKey
ALTER TABLE "Actor" ADD CONSTRAINT "Actor_actorTypeId_fkey" FOREIGN KEY ("actorTypeId") REFERENCES "ActorType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
