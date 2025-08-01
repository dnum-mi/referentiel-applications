import type { User } from "./user";

export interface Actor {
  id?: string
  role?: string
  email: string
  firstname?: string
  lastname?: string
  userId?: string
  organizationId?: string | null
  applicationId?: string
  actorTypeId?: string | null
  user?: User
  externalOrganization?: External
}
