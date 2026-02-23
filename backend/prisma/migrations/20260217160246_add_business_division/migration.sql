-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "businessDivisionId" TEXT;

-- CreateTable
CREATE TABLE "BusinessDivision" (
    "id" TEXT NOT NULL,
    "label" VARCHAR(255) NOT NULL,

    CONSTRAINT "BusinessDivision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessDivision_label_key" ON "BusinessDivision"("label");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_businessDivisionId_fkey" FOREIGN KEY ("businessDivisionId") REFERENCES "BusinessDivision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
