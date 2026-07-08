import { Permission, Roles } from "@prisma/client";

const NONE_PERMISSIONS: Set<Permission> = new Set([
  Permission.AppRead,
  Permission.AppList,
  Permission.ReportRead,
  Permission.ReportPost,
  Permission.DataRead,
]);
const READ_PERMISSIONS = new Set([
  ...Array.from(NONE_PERMISSIONS),
  Permission.MDITList,
  Permission.ColumnRead,
]);
const WRITE_PERMISSIONS = new Set([
  ...Array.from(READ_PERMISSIONS),
  Permission.CreateApplication,
  Permission.CreateGlobalReport,
  Permission.ReportManage,
  Permission.OrganizationManage,
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

export const roleToPermissions = (role: Roles) => {
  switch (role) {
    case Roles.ADMIN:
      return Array.from(ADMIN_PERMISSIONS).sort((a, b) => a.localeCompare(b));
    case Roles.CONTRIBUTOR:
      return Array.from(WRITE_PERMISSIONS).sort((a, b) => a.localeCompare(b));
    case Roles.READER:
      return Array.from(READ_PERMISSIONS).sort((a, b) => a.localeCompare(b));
    case Roles.VISITOR:
      return Array.from(NONE_PERMISSIONS).sort((a, b) => a.localeCompare(b));
  }
};

const READ_APP_PERMISSIONS = new Set([
  Permission.ActorRead,
  Permission.ComplianceRead,
  Permission.HostingRead,
  Permission.RelationRead,
  Permission.LinkRead,
  Permission.MetadataRead,
  Permission.DataRead,
]);
const WRITE_APP_PERMISSIONS = new Set([
  ...Array.from(READ_APP_PERMISSIONS),
  Permission.AppWrite,
  Permission.ActorWrite,
  Permission.ComplianceWrite,
  Permission.HostingWrite,
  Permission.RelationWrite,
  Permission.LinkWrite,
  Permission.AppWritePriority,
  Permission.DataWrite,
]);
const ADMIN_APP_PERMISSIONS = new Set(WRITE_APP_PERMISSIONS);

export const roleToAppPermissions = (role: Roles) => {
  switch (role) {
    case Roles.ADMIN:
      return Array.from(ADMIN_APP_PERMISSIONS).sort((a, b) =>
        a.localeCompare(b),
      );
    case Roles.CONTRIBUTOR:
      return Array.from(WRITE_APP_PERMISSIONS).sort((a, b) =>
        a.localeCompare(b),
      );
    case Roles.READER:
      return Array.from(READ_APP_PERMISSIONS).sort((a, b) =>
        a.localeCompare(b),
      );
    case Roles.VISITOR:
      return [];
  }
};
