import type { Permission, Roles } from "@/client";

export const RolesWording: Record<Roles, string> = {
  VISITOR: "Utilisateur",
  READER: "Lecture totale",
  CONTRIBUTOR: "Écriture totale",
  ADMIN: "Administrateur",
};

export const RolesWordingBadgeClass: Record<Roles, string> = {
  VISITOR: "fr-badge--new",
  READER: "fr-badge--info",
  CONTRIBUTOR: "fr-badge--warning",
  ADMIN: "fr-badge--error",
};

export const RolesOptions: {
  value: Roles;
  label: (typeof RolesWording)[keyof typeof RolesWording];
  id: string;
  hint: string;
}[] = [
  { value: "VISITOR", label: RolesWording["VISITOR"], id: "admin-level-visitor", hint: "Utilisateur standard" },
  { value: "READER", label: RolesWording["READER"], id: "admin-level-reader", hint: "Accès en lecture sur toutes les applications" },
  {
    value: "CONTRIBUTOR",
    label: RolesWording["CONTRIBUTOR"],
    id: "admin-level-contributor",
    hint: "Accès en écriture sur toutes les applications",
  },
  { value: "ADMIN", label: RolesWording["ADMIN"], id: "admin-level-admin", hint: "Accès administrateur" },
];

export const PERMISSIONS_LABELS: Record<Permission, string> = {
  // Permissions globales
  CreateApplication: "Créer une application",
  DeleteApplication: "Supprimer une application",
  CreateGlobalReport: "Créer des signalements globaux",
  AppList: "Voir la liste des applications",
  MDITList: "Voir la liste des MDIT",
  DataExport: "Exporter les données",
  AdminPanelManage: "Gérer le panneau d'administration",
  ActorTypePost: "Créer un type d'acteur",
  ActorTypeManage: "Modifier un type d'acteur",
  ActorTypeDelete: "Supprimer un type d'acteur",
  OrganizationManage: "Gérer l'organisation",
  // Permissions applicatives
  AppRead: "Voir les informations de base",
  AppWrite: "Modifier les informations de base",
  ActorRead: "Voir les acteurs",
  ActorWrite: "Modifier les acteurs",
  ComplianceRead: "Voir les conformités",
  ComplianceWrite: "Modifier les conformités",
  HostingRead: "Voir les hébergements",
  HostingWrite: "Modifier les hébergements",
  RelationRead: "Voir les relations",
  RelationWrite: "Modifier les relations",
  LinkRead: "Voir les liens",
  LinkWrite: "Modifier les liens",
  AppWritePriority: "Modifier la priorité de redémarrage",
  MetadataRead: "Voir l'historique des modifications",
  ReportRead: "Voir les signalements",
  ReportPost: "Créer des signalements",
  ReportManage: "Gérer les signalements",
};
