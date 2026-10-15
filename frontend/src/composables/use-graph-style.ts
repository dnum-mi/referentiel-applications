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
      stroke: "var(--border-action-high-blue-france, #000091)",
      text: "var(--text-default-grey, #1D1D1D)",
      width: 200,
      height: 100,
      borderRadius: 1,
    };

    const node = {
      fill: "var(--background-default-grey, #FFFFFF)",
      stroke: "var(--text-mention-grey, #666666)",
      text: "var(--text-default-grey, #1D1D1D)",
      width: 180,
      height: 90,
      borderRadius: 1,
    };

    const edge = {
      is_part_of: {
        color: "var(--text-action-high-blue-france, #000091)",
        style: "solid",
        dasharray: "none",
        patternLabel: "trait continu",
        width: 2,
      },
      in_replacement_of: {
        color: "var(--text-mention-grey, #666666)",
        style: "dashed",
        dasharray: "12 4",
        patternLabel: "tirets longs",
        width: 2,
      },
      is_service_user_of: {
        color: "var(--text-action-high-green-emeraude, #297254)",
        style: "dashed",
        dasharray: "6 4",
        patternLabel: "tirets courts",
        width: 2,
      },
      is_data_user_of: {
        color: "var(--text-action-high-red-marianne, #c9191e)",
        style: "dotted",
        dasharray: "2 4",
        patternLabel: "pointillés",
        width: 2,
      },
      use_sso_of: {
        color: "var(--text-action-high-purple-glycine, #6e445a)",
        style: "dashed",
        dasharray: "12 4 2 4",
        patternLabel: "tiret et point",
        width: 2,
      },
      is_correlated_with: {
        color: "var(--text-action-high-orange-terre-battue, #755348)",
        style: "dashed",
        dasharray: "12 4 2 4 2 4",
        patternLabel: "tiret et deux points, sans flèche",
        width: 2,
      },
    } as const satisfies {
      [key in RelationType]: {
        color: string;
        style: "solid" | "dotted" | "dashed";
        dasharray: string;
        patternLabel: string;
        width: number;
      };
    };

    return { root, node, edge };
  };

  return { getGraphStyles };
}
