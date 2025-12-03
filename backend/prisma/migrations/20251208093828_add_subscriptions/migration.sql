-- AlterTable
ALTER TABLE "User" ALTER COLUMN id SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_pkey" PRIMARY KEY USING INDEX "User_id_key";

-- CreateTable
CREATE TABLE "_UserFollowedApplications" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserFollowedApplications_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserFollowedApplications_B_index" ON "_UserFollowedApplications"("B");

-- AddForeignKey
ALTER TABLE "_UserFollowedApplications" ADD CONSTRAINT "_UserFollowedApplications_A_fkey" FOREIGN KEY ("A") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserFollowedApplications" ADD CONSTRAINT "_UserFollowedApplications_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
