import { Permission, Roles } from "@prisma/client";
import { AppPermissionsValues } from "src/common/utils/types";

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
// 3e niveau d'administration — l'administrateur d'UNE application (ActorType.isAdmin).
// Jeu applicatif COMPLET (toute la matrice AppPermissions : couples read/write + AppRead,
// AppWritePriority, MetadataRead, DataRead/Write, ReportRead/Post/Manage), dérivé de la
// source canonique `AppPermissionsValues` pour rester exhaustif. Ce jeu est **borné à
// l'application** de l'acteur (cf. check-permissions.service) et est DISTINCT du rôle ADMIN :
//  - ADMIN global (sans scope)  → droits de rôle projetés sur TOUTES les apps ;
//  - ADMIN de périmètre (+scope) → droits de rôle projetés sur les apps du périmètre ;
//  - admin d'application         → CE jeu complet, sur sa seule application.
export const APP_ADMIN_PERMISSIONS = new Set(AppPermissionsValues);

// Au niveau applicatif, le rôle ADMIN (global ou de périmètre) projette les mêmes droits
// que CONTRIBUTOR (écriture) — comportement historique. Les droits « admin complet d'une
// app » ne viennent PAS du rôle mais de l'acteur admin (APP_ADMIN_PERMISSIONS ci-dessus),
// afin de ne pas faire d'un admin global un admin-complet-de-chaque-app par son seul rôle.
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
