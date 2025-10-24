import type { Status } from "@prisma/client";

export class ApplicationStatus {
  id: string;
  applicationId: string;
  status: Status;
  statusDate: Date | null;
  createdAt: Date;
}
