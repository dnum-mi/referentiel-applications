import type { Roles } from "@/client";

export interface User {
  keycloakId: string;
  email: string;
  role: Roles;
}
