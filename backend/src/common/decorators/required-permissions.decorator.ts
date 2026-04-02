import { SetMetadata } from "@nestjs/common";
import { Permission } from "@prisma/client";

export const REQUIRED_PERMISSIONS = "requiredPermissions";
export function RequiredPermissions(permissions: Permission[]) {
  return SetMetadata(REQUIRED_PERMISSIONS, permissions);
}
