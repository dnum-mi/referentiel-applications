export interface Organisation {
  createdby: string;
  createdat: Date;
  updatedby: string;
  updatedat: Date;
  comments: string | null;
  organisationunitid: string;
  parentid: string | null;
  organisationcode: string;
  label: string;
  description: string | null;
  id: string;
}
