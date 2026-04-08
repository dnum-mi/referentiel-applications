-- CreateTable
CREATE TABLE "UserPermissionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT,
    "role" "Roles",
    "additionalPermissions" "Permission"[],

    CONSTRAINT "UserPermissionLog_pkey" PRIMARY KEY ("id")
);
