export const TRESHOLD_TIME_MATURITY = 2.5;
export type TimeQuadrant = "Tolerate" | "Invest" | "Migrate" | "Eliminate";
export function getTimeQuadrant(technicalMaturity: number, businessMaturity: number) {
  const threshold = TRESHOLD_TIME_MATURITY;
  if (technicalMaturity >= threshold && businessMaturity >= threshold) return "Invest";
  if (technicalMaturity < threshold && businessMaturity >= threshold) return "Tolerate";
  if (technicalMaturity >= threshold && businessMaturity < threshold) return "Migrate";
  return "Eliminate";
}
