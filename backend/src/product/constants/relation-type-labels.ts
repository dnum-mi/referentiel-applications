export const RelationTypeLabelsBidirectional: Record<
  string,
  { source: string; target: string }
> = {
  is_part_of: {
    source: 'Fait partie de',
    target: 'A comme sous‑élément',
  },
  in_replacement_of: {
    source: 'Remplace',
    target: 'Remplacé par',
  },
  is_service_user_of: {
    source: 'Utilise le service de',
    target: 'Fournit le service à',
  },
  is_data_user_of: {
    source: 'Utilise la donnée de',
    target: 'Fournit la donnée à',
  },
};
