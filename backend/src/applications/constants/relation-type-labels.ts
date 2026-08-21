import { RelationType } from "@prisma/client";

/// Source unique des libellés de type de relation (#2246). La variante
/// « direction source » (RelationTypeLabels, enum-label.ts) en est dérivée ;
/// le wording frontend (dictionary.ts, relationTypeLabels) doit rester aligné
/// sur les libellés `source` (casse de phrase à part).
export const RelationTypeLabelsBidirectional = {
  is_part_of: {
    source: "Fait partie de",
    target: "A comme sous‑élément",
  },
  in_replacement_of: {
    source: "Remplace",
    target: "Remplacé par",
  },
  is_service_user_of: {
    source: "Utilise le service de",
    target: "Fournit le service à",
  },
  is_data_user_of: {
    source: "Utilise les données de",
    target: "Fournit les données à",
  },
  use_sso_of: {
    source: "Utilise le SSO de",
    target: "Fournit le SSO à",
  },
  // Relation symétrique (#2281) : même libellé quelle que soit la direction.
  is_correlated_with: {
    source: "Est corrélée à",
    target: "Est corrélée à",
  },
} satisfies Record<RelationType, { source: string; target: string }>;
