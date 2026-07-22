import { Permission, Roles } from "@prisma/client";

const NONE_PERMISSIONS: Set<Permission> = new Set([
  Permission.AppRead,
  Permission.AppList,
  Permission.ReportRead,
  Permission.ReportPost,
  Permission.DataRead,
  // « Lecture pour tous » de la stack technique (#2027) : comme DataRead, la lecture des
  // technologies est accordée globalement (socle VISITOR) afin que l'onglet reste visible
  // même pour un utilisateur non-acteur de l'application. Seule l'écriture (TechnologyWrite)
  // est restreinte via la matrice / les rôles. Avant #2027 l'onglet était gardé par AppRead,
  // déjà présent ici — sans cette ligne, migrer vers TechnologyRead masquerait l'onglet.
  Permission.TechnologyRead,
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
  // Gère le catalogue de données partagé (data descriptions, familles, sensibilités) :
  // ces entités ne sont rattachées à aucune application, donc DataWrite doit être résolu ici en
  // tant que permission globale (les routes /data-catalog/descriptions|families|sensibilities
  // n'ont pas de :applicationId permettant de le résoudre via roleToAppPermissions).
  Permission.DataWrite,
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
  Permission.TechnologyRead,
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
  Permission.TechnologyWrite,
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
