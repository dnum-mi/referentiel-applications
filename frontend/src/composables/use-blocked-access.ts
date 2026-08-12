import { readonly, ref } from "vue";

interface BlockedAccessResponse {
  blocked: true;
  message?: string;
}

const blockedAccess = ref(false);
export const blockedAccessState = readonly(blockedAccess);

export function isBlockedAccessResponse(value: unknown): value is BlockedAccessResponse {
  return typeof value === "object" && value !== null && "blocked" in value && value.blocked === true;
}

export function setBlockedAccess(active: boolean): void {
  blockedAccess.value = active;
}
