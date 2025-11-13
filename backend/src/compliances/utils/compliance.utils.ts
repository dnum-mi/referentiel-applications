const COMPLIANCE_LABELS: Record<string, string> = {
  dima_: "DIMA",
  pdma_: "PDMA",
  rgaa_: "RGAA",
  dsfr_: "DSFR",
  rgpd_: "RGPD",
  homologation_: "Homologation",
};

export function detectCompliances(updatedKeys: string[]) {
  const set = new Set<string>();
  for (const k of updatedKeys) {
    for (const prefix in COMPLIANCE_LABELS) {
      if (k.startsWith(prefix)) set.add(COMPLIANCE_LABELS[prefix]);
    }
  }
  return Array.from(set);
}
