import { test } from "@playwright/test";

/** Réservé aux données variables ; une fixture seedée ou créée par le test doit être assertée. */
export function skipIfOptionalDataMissing(
  missing: boolean,
  reason: string,
): void {
  if (!missing) return;
  test.info().annotations.push({ type: "optional-data", description: reason });
  test.skip(true, `Donnée optionnelle : ${reason}`);
}
