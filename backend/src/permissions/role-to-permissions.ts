import { Permission, Roles } from "@prisma/client";

const NONE_PERMISSIONS: Set<Permission> = new Set([
  Permission.AppRead,
  Permission.AppList,
  Permission.ReportRead,
  Permission.ReportPost,
  Permission.DataRead,
  // TechnologyRead n'est volontairement PAS dans ce socle (#2088, défait la « lecture pour
  // tous » de #2027) : comme les autres onglets (Acteurs, Liens…), la stack technique n'est
  // visible que via la projection de rôle par application (READER+, cf. READ_APP_PERMISSIONS)
  // ou via la matrice du type d'acteur — un VISITOR non-acteur ne voit pas l'onglet.
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
  Permission.GlobalAdminManage,
  Permission.DataExport,
  Permission.DeleteApplication,
  Permission.ActorTypePost,
  // QualityCampaignManage et MditCampaignManage ne sont PAS incluses ici (#2608) : contrairement
  // aux autres permissions de ce socle, la gestion des campagnes (qualité ou dette IT) n'est
  // jamais accordée par défaut à un administrateur, y compris global. Elle doit être indiquée
  // explicitement via la couche 2 (additionalPermissions), pour lui comme pour un utilisateur
  // délégué non-admin — cf. DELEGABLE_PERMISSIONS ci-dessous.
]);

/**
 * #2446 — Capacités d'administration retirées à un administrateur ayant un PÉRIMÈTRE
 * organisationnel : elles portent sur des objets transverses (tags, sources, tokens, batchs,
 * matrice des permissions, directions métier, journal des actions…) qui ne sont rattachés à
 * aucune organisation, donc qu'aucun périmètre ne peut découper. L'administrateur de périmètre
 * conserve `AdminPanelManage`, qui ne lui ouvre plus que l'administration des utilisateurs et des
 * acteurs — déjà filtrée par son périmètre.
 *
 * `QualityCampaignManage` et `MditCampaignManage` n'ont pas besoin d'y figurer (#2608) : elles ne
 * sont de toute façon JAMAIS incluses dans `ADMIN_PERMISSIONS`, scopé ou non — un administrateur
 * ne gère les campagnes (qualité ou dette IT) que si elles lui sont explicitement déléguées
 * (couche 2, `User.additionalPermissions`), conformément à « seuls les utilisateurs ayant accès à
 * la capacité gestion des campagnes peuvent gérer les campagnes ».
 */
const SCOPED_ADMIN_EXCLUDED_PERMISSIONS: ReadonlySet<Permission> = new Set([
  Permission.GlobalAdminManage,
]);

/**
 * Permissions qu'un administrateur peut déléguer individuellement à un utilisateur (couche 2,
 * `User.additionalPermissions`). Liste FERMÉE : tout ce qui n'y figure pas (AdminPanelManage,
 * DeleteApplication, permissions applicatives…) est refusé par le DTO de mise à jour (#2498),
 * pour qu'une délégation ne puisse jamais fabriquer un super-administrateur.
 * Miroir de la liste proposée par le panneau d'administration (UserActions.vue).
 *
 * QualityCampaignManage et MditCampaignManage y figurent aussi pour un ADMIN (#2608) : ces deux
 * permissions ne sont jamais accordées par le rôle (cf. ADMIN_PERMISSIONS) et doivent donc
 * toujours être ajoutées explicitement ici, même pour un administrateur.
 */
export const DELEGABLE_PERMISSIONS: readonly Permission[] = [
  Permission.CreateApplication,
  Permission.CreateGlobalReport,
  Permission.DataExport,
  Permission.MDITList,
  Permission.QualityCampaignManage,
  Permission.MditCampaignManage,
];

/**
 * Permissions globales d'un principal. `scoped` indique qu'il porte un périmètre
 * organisationnel : seul le socle ADMIN en dépend (cf. `SCOPED_ADMIN_EXCLUDED_PERMISSIONS`),
 * les autres rôles n'ayant aucune capacité transverse à retirer.
 */
export const roleToPermissions = (
  role: Roles,
  { scoped = false }: { scoped?: boolean } = {},
) => {
  switch (role) {
    case Roles.ADMIN:
      return Array.from(ADMIN_PERMISSIONS)
        .filter(
          (permission) =>
            !scoped || !SCOPED_ADMIN_EXCLUDED_PERMISSIONS.has(permission),
        )
        .sort((a, b) => a.localeCompare(b));
    case Roles.CONTRIBUTOR:
      return Array.from(WRITE_PERMISSIONS).sort((a, b) => a.localeCompare(b));
    case Roles.READER:
      return Array.from(READ_PERMISSIONS).sort((a, b) => a.localeCompare(b));
    case Roles.VISITOR:
      return Array.from(NONE_PERMISSIONS).sort((a, b) => a.localeCompare(b));
  }
};

/**
 * Point d'entrée canonique pour dériver les permissions globales d'un principal : il porte lui
 * même son périmètre, ce qui évite d'oublier de le transmettre (#2446). Utiliser
 * `roleToPermissions` directement seulement quand aucun principal n'existe (requestor système).
 */
export const principalToPermissions = (principal: {
  role: Roles;
  scopeOrganizationId?: string | null;
}) =>
  roleToPermissions(principal.role, {
    scoped: !!principal.scopeOrganizationId,
  });

export const READ_APP_PERMISSIONS = new Set([
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
