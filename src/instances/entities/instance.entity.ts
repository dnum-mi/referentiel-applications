export class Instance {
  createdby: string;
  createdat?: Date | string;
  updatedby: string;
  updatedat?: Date | string;
  comments?: string | null;
  environmentid: string;
  applicationid: string;
  instancerole?: string | null;
  instancestatus?: string;
  tenant?: string | null;
  fip?: string | null;
  url?: string | null;
  deploymentdate?: Date | string | null;
  id?: string;
}
