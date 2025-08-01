export enum AdminLevel {
  NONE = 0,
  READ = 10,
  WRITE = 20,
  ADMIN = 30,
}
export interface User {
  keycloakId: string
  email: string
  adminLevel: AdminLevel
  lastLogin: Date | null
}
