export enum AppDataFlowOrient {
  push = 'push',
  pull = 'pull',
  bi_directional = 'bi_directional',
}

export class ApplicationFlow {
  createdby: string;
  createdat: Date;
  updatedby: string;
  updatedat: Date;
  comments: string | null;
  flowid: string;
  applicationsourceid: string | null;
  organisationunitsourceid: string | null;
  applicationtargetid: string | null;
  organisationunittargetid: string | null;
  middleware: string | null;
  flowtypeid: string | null;
  flowprotocolid: string | null;
  flowperiodid: string | null;
  flowdataorientation: AppDataFlowOrient;
  ports: string | null;
  id: string;
}
