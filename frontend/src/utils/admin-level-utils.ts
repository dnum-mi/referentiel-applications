import type { AdminLevel } from "@/models/user";

export const AdminLevelWording: Record<AdminLevel, string> = {
  0: "Utilisateur",
  10: "Lecture totale",
  20: "Écriture totale",
  30: "Administrateur",
};

export const AdminLevelWordingBadgeClass: Record<AdminLevel, string> = {
  0: "fr-badge--new",
  10: "fr-badge--info",
  20: "fr-badge--warning",
  30: "fr-badge--error",
};

export const AdminLevelOptions: {
  value: AdminLevel
  label: (typeof AdminLevelWording)[keyof typeof AdminLevelWording]
  id: string
  hint: string
}[] = [
  { value: 0, label: AdminLevelWording[0], id: "admin-level-0", hint: "Utilisateur standard" },
  { value: 10, label: AdminLevelWording[10], id: "admin-level-10", hint: "Accès en lecture sur toutes les applications" },
  { value: 20, label: AdminLevelWording[20], id: "admin-level-20", hint: "Accès en écriture sur toutes les applications" },
  { value: 30, label: AdminLevelWording[30], id: "admin-level-30", hint: "Accès administrateur" },
];
