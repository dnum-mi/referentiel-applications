export enum AdminLevel {
  NONE = 0,
  READ = 10,
  WRITE = 20,
  ADMIN = 30,
}

export class UserEntity {
  keycloakId: string;
  email: string;
  adminLevel: AdminLevel; // Changed from permissions to adminLevel
  organizationId: string | null;
  lastLogin: Date | null;
}
