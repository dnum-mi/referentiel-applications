-- CreateEnum
CREATE TYPE "StatsType" AS ENUM ('iqAvg');

-- CreateTable
CREATE TABLE "stats" (
    "id" TEXT NOT NULL,
    "valeur" DOUBLE PRECISION NOT NULL,
    "type" "StatsType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stats_date_key" ON "stats"("date");
