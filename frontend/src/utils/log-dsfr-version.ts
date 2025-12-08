import dsfrPkg from "@gouvfr/dsfr/package.json";

export function logDsfrVersion(): void {
  console.log(`DSFR version: ${dsfrPkg.version}`);
}
