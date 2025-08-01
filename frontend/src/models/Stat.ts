export type GroupBy = "jour" | "semaine" | "mois" | "année";

export interface IqAvg {
  label: string
  moyenne: number
  min: number
  max: number
  count: number
}
