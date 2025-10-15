import { SetMetadata } from "@nestjs/common";
import type { UserCapabilities } from "src/user/entities/user.entity";

export const USER_CAPABILITY_KEY = "userCapability";
export function RequiredUserCapability(capability: keyof typeof UserCapabilities) {
  return SetMetadata(USER_CAPABILITY_KEY, capability);
}
