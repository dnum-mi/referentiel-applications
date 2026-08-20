-- CreateEnum
CREATE TYPE "CorrelationSuggestionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterEnum
ALTER TYPE "RelationType" ADD VALUE 'is_correlated_with';

-- CreateTable
CREATE TABLE "CorrelationSuggestion" (
    "id" TEXT NOT NULL,
    "applicationSourceId" TEXT NOT NULL,
    "applicationTargetId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "signals" JSONB NOT NULL,
    "status" "CorrelationSuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "CorrelationSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorrelationSuggestion_status_score_idx" ON "CorrelationSuggestion"("status", "score");

-- CreateIndex
CREATE INDEX "CorrelationSuggestion_applicationTargetId_idx" ON "CorrelationSuggestion"("applicationTargetId");

-- CreateIndex
CREATE UNIQUE INDEX "CorrelationSuggestion_applicationSourceId_applicationTarget_key" ON "CorrelationSuggestion"("applicationSourceId", "applicationTargetId");

-- AddForeignKey
ALTER TABLE "CorrelationSuggestion" ADD CONSTRAINT "CorrelationSuggestion_applicationSourceId_fkey" FOREIGN KEY ("applicationSourceId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrelationSuggestion" ADD CONSTRAINT "CorrelationSuggestion_applicationTargetId_fkey" FOREIGN KEY ("applicationTargetId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrelationSuggestion" ADD CONSTRAINT "CorrelationSuggestion_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

