import type { APP_PERMISSIONS } from "../utils/types";
import { SetMetadata } from "@nestjs/common";

export const APP_ACTION_KEY = "action";

export function AppAction(action: APP_PERMISSIONS | APP_PERMISSIONS[]) {
  return SetMetadata(APP_ACTION_KEY, action);
}
