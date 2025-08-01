export type GroupBy = "day" | "week" | "month" | "year";

export interface IqAvg {
  label: string
  moyenne: number
  min: number
  max: number
  count: number
}
