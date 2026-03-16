-- CreateTable
CREATE TABLE "ecoEnergy" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "indice" DOUBLE PRECISION NOT NULL,
    "ges" DOUBLE PRECISION NOT NULL,
    "water" DOUBLE PRECISION NOT NULL,
    "date_scan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ecoEnergy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ecoEnergy_applicationId_idx" ON "ecoEnergy"("applicationId");

-- AddForeignKey
ALTER TABLE "ecoEnergy" ADD CONSTRAINT "ecoEnergy_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
