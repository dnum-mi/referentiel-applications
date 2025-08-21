-- CreateTable
CREATE TABLE "tags" (
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "application_tag" (
    "applicationId" TEXT NOT NULL,
    "tagName" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_tag_pkey" PRIMARY KEY ("applicationId","tagName")
);

-- CreateIndex
CREATE INDEX "application_tag_tagName_idx" ON "application_tag"("tagName");

-- CreateIndex
CREATE INDEX "application_tag_applicationId_idx" ON "application_tag"("applicationId");

-- AddForeignKey
ALTER TABLE "application_tag" ADD CONSTRAINT "application_tag_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_tag" ADD CONSTRAINT "application_tag_tagName_fkey" FOREIGN KEY ("tagName") REFERENCES "tags"("name") ON DELETE CASCADE ON UPDATE CASCADE;
