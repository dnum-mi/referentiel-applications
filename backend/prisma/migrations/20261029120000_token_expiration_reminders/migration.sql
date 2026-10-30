ALTER TYPE "NotificationType" ADD VALUE 'token_expiration_reminder';

CREATE TABLE "TokenExpirationReminder" (
    "tokenId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TokenExpirationReminder_pkey" PRIMARY KEY ("tokenId", "expiresAt"),
    CONSTRAINT "TokenExpirationReminder_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
