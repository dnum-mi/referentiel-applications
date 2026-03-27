import { AdminLevel } from "src/user/entities/user.entity";
import { Permission } from "@prisma/client";

const NONE_PERMISSIONS: Set<Permission> = new Set();
const READ_PERMISSIONS = new Set([
  ...Array.from(NONE_PERMISSIONS),
  Permission.AppList,
  Permission.readBase,
  Permission.readActors,
  Permission.readCompliances,
  Permission.readHostings,
  Permission.readRelations,
  Permission.readLinks,
  Permission.readMetadata,
  Permission.readReports,
]);
const WRITE_PERMISSIONS = new Set([
  ...Array.from(READ_PERMISSIONS),
  Permission.CreateApplication,
  Permission.CreateGlobalReport,
  Permission.writeBase,
  Permission.writeActors,
  Permission.writeCompliances,
  Permission.writeHostings,
  Permission.writeRelations,
  Permission.writeLinks,
  Permission.writePriorityRestart,
  Permission.postReports,
  Permission.manageReports,
  Permission.deleteActorType,
  Permission.manageActorType,
]);
const ADMIN_PERMISSIONS = new Set([
  ...Array.from(WRITE_PERMISSIONS),
  Permission.manageAdminPanel,
  Permission.DataExport,
  Permission.DeleteApplication,
  Permission.postActorType,
]);

export const roleToPermissions = (adminLevel: AdminLevel) => {
  switch (adminLevel) {
    case AdminLevel.ADMIN:
      return ADMIN_PERMISSIONS;
    case AdminLevel.WRITE:
      return WRITE_PERMISSIONS;
    case AdminLevel.READ:
      return READ_PERMISSIONS;
    case AdminLevel.NONE:
      return NONE_PERMISSIONS;
  }
};
