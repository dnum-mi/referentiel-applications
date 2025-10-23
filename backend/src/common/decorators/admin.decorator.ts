import type { AdminLevel as AdmLevel } from "src/user/entities/user.entity";
import { SetMetadata } from "@nestjs/common";

export const ADMIN_LEVEL_KEY = "adminLevel";
export function RequiredAdminLevel(level: AdmLevel) {
  return SetMetadata(ADMIN_LEVEL_KEY, level);
}
