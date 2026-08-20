import type { RelationType } from "@/client";

/**
 * Types de relation dont la direction ne porte aucun sens métier : la paire
 * est stockée en ordre canonique (ordre des identifiants), donc afficher une
 * flèche laisserait croire à une orientation qui n'existe pas.
 */
export const SYMMETRIC_RELATION_TYPES: ReadonlySet<string> = new Set<string>(["is_correlated_with"]);

/** Une arête de ce type doit-elle être fléchée ? */
export function isDirectedRelation(type: string): boolean {
  return !SYMMETRIC_RELATION_TYPES.has(type);
}

export function useGraphStyles() {
  const getGraphStyles = () => {
    const root = {
      fill: "var(--background-action-low-blue-france, #e7eaf0ff)",
      stroke: "var(--background-action-low-blue-france, #e7eaf0ff)",
      text: "var(--text-default-grey, #1D1D1D)",
      width: 160,
      height: 80,
      borderRadius: 1,
    };

    const node = {
      fill: "var(--background-default-grey, #FFFFFF)",
      stroke: "var(--border-default-grey, #D1D5DB)",
      text: "var(--text-default-grey, #1D1D1D)",
      width: 140,
      height: 70,
      borderRadius: 1,
    };

    const edge = {
      is_part_of: { color: "var(--blue-france-600, #2563EB)", style: "solid", width: 2 },
      in_replacement_of: { color: "var(--grey-500, #929292)", style: "dashed", width: 2 },
      is_service_user_of: { color: "var(--green-600, #00A97E)", style: "solid", width: 2 },
      is_data_user_of: { color: "var(--red-marianne-600, #DB2777)", style: "dotted", width: 2 },
      use_sso_of: { color: "var(--purple-glycine-600, #7C3AED)", style: "solid", width: 2 },
      is_correlated_with: { color: "var(--orange-terre-battue-600, #E4794A)", style: "dashed", width: 2 },
    } as const satisfies {
      [key in RelationType]: { color: string; style: "solid" | "dotted" | "dashed"; width: number };
    };

    return { root, node, edge };
  };

  return { getGraphStyles };
}
