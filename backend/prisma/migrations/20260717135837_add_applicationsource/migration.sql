-- CreateTable
CREATE TABLE "_ApplicationToDataDescription" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ApplicationToDataDescription_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ApplicationToDataDescription_B_index" ON "_ApplicationToDataDescription"("B");

-- AddForeignKey
ALTER TABLE "_ApplicationToDataDescription" ADD CONSTRAINT "_ApplicationToDataDescription_A_fkey" FOREIGN KEY ("A") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApplicationToDataDescription" ADD CONSTRAINT "_ApplicationToDataDescription_B_fkey" FOREIGN KEY ("B") REFERENCES "DataDescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
