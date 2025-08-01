import type { Application, User } from "./Application";

export interface ReportIssue {
  application?: Application
  notifier?: User
  description: string
  status: string
  createdAt: string
}
