export type GroupBy = "day" | "week" | "month" | "year";

export interface StatEntry {
  date: Date;
  valeur: number;
}

export interface GroupedStat {
  label: string;
  moyenne: number;
  min: number;
  max: number;
  count: number;
}
