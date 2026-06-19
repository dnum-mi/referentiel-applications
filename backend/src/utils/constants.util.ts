import type { MetadataAction } from "@prisma/client";

export const API_KEY_HEADER = "x-refapp-token";

/// Header envoyé par un administrateur pour impersonner un autre utilisateur.
/// Contient l'identifiant de l'utilisateur cible.
export const IMPERSONATE_HEADER = "x-impersonate-user-id";

export const MetadataTypes: Record<
  string,
  { label: string; dbAction: MetadataAction }
> = {
  add: {
    label: "Création",
    dbAction: "add",
  },
  update: {
    label: "Modification",
    dbAction: "update",
  },
  delete: {
    label: "Suppression",
    dbAction: "delete",
  },
  export: {
    label: "Export Excel",
    dbAction: "export",
  },
};
