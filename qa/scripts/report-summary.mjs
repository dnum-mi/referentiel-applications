import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** Rend les skips visibles, y compris quand un prérequis a empêché le démarrage des tests. */
export function renderReportSummary(report) {
  const counts = { passed: 0, failed: 0, flaky: 0, skipped: 0 };
  const skipped = [];
  const walk = (suite) => {
    for (const child of suite.suites ?? []) walk(child);
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const last = test.results?.at(-1);
        if (test.status === "skipped" || last?.status === "skipped") {
          counts.skipped++;
          const reason = (test.annotations ?? [])
            .filter((a) => a.type === "optional-data" || a.type === "skip")
            .map((a) => a.description)
            .filter(Boolean)
            .join(" ; ");
          skipped.push(
            `- ${spec.title} (${test.projectName ?? ""}) : ${reason || "raison non renseignée"}`,
          );
        } else if (test.status === "unexpected" || !last) {
          counts.failed++;
        } else if (test.status === "flaky") {
          counts.flaky++;
        } else {
          counts.passed++;
        }
      }
    }
  };
  for (const suite of report.suites ?? []) walk(suite);
  const errors = (report.errors ?? []).map(
    (error) => error.message ?? String(error),
  );
  return [
    "## Non-régression QA",
    "",
    `Réussis : **${counts.passed}** · Échecs : **${counts.failed}** · Instables : **${counts.flaky}** · Ignorés : **${counts.skipped}**`,
    "",
    ...skipped,
    ...(errors.length
      ? [
          "",
          "### Erreurs de préparation",
          "",
          ...errors.map((error) => `\n\`\`\`text\n${error}\n\`\`\``),
        ]
      : []),
    "",
  ].join("\n");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const report = JSON.parse(
    readFileSync(process.argv[2] ?? "e2e/results.json", "utf8"),
  );
  const summary = renderReportSummary(report);
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}
