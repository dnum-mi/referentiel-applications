import type { CountByIqDto } from "@/client";

/** Les bornes suivent l'IQ arrondi utilisé par le graphique historique. */
export function iqDistribution(counts: CountByIqDto[]) {
  const rows = Array.from({ length: 21 }, (_, index) => ({ iq: index === 20 ? "100 %" : `${index * 5}–${index * 5 + 4} %`, total: 0 }));
  for (const { iq, total } of counts) {
    if (!Number.isFinite(iq) || iq < 0 || iq > 100) continue;
    const index = Math.floor(Math.round(iq) / 5);
    rows[index]!.total += total;
  }
  return rows;
}
