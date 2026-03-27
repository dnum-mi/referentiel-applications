import type { Roles } from "@/client";

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
