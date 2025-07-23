export class UserEntity {
  keycloakId: string;
  email: string;
  permissions: string;
  organizationId: string | null;
  lastLogin: Date | null;
}
