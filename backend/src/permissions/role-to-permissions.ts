import { AdminLevel } from "src/user/entities/user.entity";
import { Permission } from "@prisma/client";

const NONE_PERMISSIONS: Set<Permission> = new Set();
const READ_PERMISSIONS = new Set([
  ...Array.from(NONE_PERMISSIONS),
  Permission.AppList,
  Permission.AppRead,
  Permission.ActorRead,
  Permission.ComplianceRead,
  Permission.HostingRead,
  Permission.RelationRead,
  Permission.LinkRead,
  Permission.MetadataRead,
  Permission.ReportRead,
]);
const WRITE_PERMISSIONS = new Set([
  ...Array.from(READ_PERMISSIONS),
  Permission.CreateApplication,
  Permission.CreateGlobalReport,
  Permission.AppWrite,
  Permission.ActorWrite,
  Permission.ComplianceWrite,
  Permission.HostingWrite,
  Permission.RelationWrite,
  Permission.LinkWrite,
  Permission.AppWritePriority,
  Permission.ReportPost,
  Permission.ReportManage,
  Permission.ActorTypeDelete,
  Permission.ActorTypeManage,
]);
const ADMIN_PERMISSIONS = new Set([
  ...Array.from(WRITE_PERMISSIONS),
  Permission.AdminPanelManage,
  Permission.DataExport,
  Permission.DeleteApplication,
  Permission.ActorTypePost,
]);

export const roleToPermissions = (adminLevel: AdminLevel) => {
  switch (adminLevel) {
    case AdminLevel.ADMIN:
      return Array.from(ADMIN_PERMISSIONS).sort();
    case AdminLevel.WRITE:
      return Array.from(WRITE_PERMISSIONS).sort();
    case AdminLevel.READ:
      return Array.from(READ_PERMISSIONS).sort();
    case AdminLevel.NONE:
      return Array.from(NONE_PERMISSIONS).sort();
  }
};
