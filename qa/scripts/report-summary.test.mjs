import assert from "node:assert/strict";
import { test } from "node:test";
import { renderReportSummary } from "./report-summary.mjs";

test("counts final test outcomes without counting retries twice, and lists skip reasons", () => {
  const summary = renderReportSummary({
    suites: [
      {
        suites: [
          {
            specs: [
              {
                title: "SCP-01",
                tests: [
                  { status: "expected", results: [{ status: "passed" }] },
                  { status: "unexpected", results: [{ status: "failed" }] },
                  {
                    status: "flaky",
                    results: [{ status: "failed" }, { status: "passed" }],
                  },
                  {
                    status: "skipped",
                    results: [{ status: "skipped" }],
                    annotations: [
                      {
                        type: "optional-data",
                        description: "Aucune donnée variable",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });
  assert.match(
    summary,
    /Réussis : \*\*1\*\* · Échecs : \*\*1\*\* · Instables : \*\*1\*\* · Ignorés : \*\*1\*\*/,
  );
  assert.match(summary, /SCP-01.*Aucune donnée variable/);
});

test("shows setup failures even when no test ran", () => {
  const summary = renderReportSummary({
    suites: [],
    errors: [{ message: "Fixture QA-SCOPE-TOTO absente" }],
  });
  assert.match(summary, /Erreurs de préparation/);
  assert.match(summary, /QA-SCOPE-TOTO/);
  assert.match(summary, /Réussis : \*\*0\*\*/);
});
