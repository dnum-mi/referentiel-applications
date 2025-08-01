import { SetMetadata } from "@nestjs/common";
import type { AdminLevel as AdmLevel } from "src/user/entities/user.entity";

export const ADMIN_LEVEL_KEY = "adminLevel";
export function RequiredAdminLevel(level: AdmLevel) {
  return SetMetadata(ADMIN_LEVEL_KEY, level);
}
