export interface Actor {
  id?: string;
  role?: string;
  email: string;
  firstname?: string;
  lastname?: string;
  type?: string;
  userId?: string;
  organizationId?: string | null;
  applicationId?: string;
  user?: User;
  externalOrganization?: External;
}
