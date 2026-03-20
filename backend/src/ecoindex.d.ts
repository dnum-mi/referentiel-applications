declare module "ecoindex" {
  export function computeEcoIndex(
    dom: number,
    req: number,
    size: number,
  ): number;
  export function computeGreenhouseGasesEmissionfromEcoIndex(
    ecoIndex: number,
  ): number;
  export function computeWaterConsumptionfromEcoIndex(ecoIndex: number): number;
  export function computeQuantile(
    dom: number,
    req: number,
    size: number,
  ): number;
  export function getEcoIndexGrade(ecoIndex: number): string;
  export function getEcoIndexGradesList(): string[];
  export function getQuantiles(): number[];
}
