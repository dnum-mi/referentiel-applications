import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const cli = require.resolve("@playwright/test/cli");
const listOnly = process.argv.includes("--list");
const phase = process.argv.includes("--static") ? "cases" : "interactive";
const files = process.argv
  .slice(2)
  .filter((arg) => !["--list", "--static"].includes(arg));
if (
  !files.length ||
  files.some((file) => !/^tests\/nvda-[a-z-]+\.spec\.ts$/.test(file))
)
  throw new Error("Explicit native spec files are required.");
if (
  !listOnly &&
  (process.platform !== "win32" ||
    process.env.GITHUB_ACTIONS !== "true" ||
    process.env.RGAA_ALLOW_WINDOWS_AT !== "1")
)
  throw new Error(
    "Execution is restricted to the authorised ephemeral Windows runner.",
  );

const args = [
  cli,
  "test",
  "--config",
  phase === "interactive" ? "interactive.config.ts" : "playwright.config.ts",
  ...files,
];
const listed = spawnSync(
  process.execPath,
  [...args, "--list", "--reporter=json"],
  {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  },
);
if (listed.status !== 0) throw new Error(listed.stderr || listed.stdout);
const inventory = JSON.parse(listed.stdout);
function specs(suites) {
  return suites.flatMap((suite) => [
    ...(suite.specs ?? []),
    ...specs(suite.suites ?? []),
  ]);
}
const cases = specs(inventory.suites);
if (
  !cases.length ||
  new Set(cases.map((item) => item.title)).size !== cases.length
)
  throw new Error(
    "The selected native cases must be nonempty and uniquely named.",
  );
if (listOnly) {
  console.log(
    JSON.stringify(
      cases.map(({ title, file }) => ({ title, file })),
      null,
      2,
    ),
  );
} else {
  const started = new Date();
  mkdirSync("evidence", { recursive: true });
  const aggregate = {
    config: inventory.config,
    suites: [],
    errors: [],
    stats: {
      startTime: started.toISOString(),
      duration: 0,
      expected: 0,
      skipped: 0,
      unexpected: 0,
      flaky: 0,
    },
  };
  const isolation = {
    strategy:
      "one fresh Playwright process, browser and reader per case; no retry",
    cases: [],
  };
  const persist = () => {
    aggregate.stats.duration = Date.now() - started.getTime();
    writeFileSync(
      `evidence/${phase}-results.json`,
      JSON.stringify(aggregate, null, 2),
    );
    writeFileSync(
      `evidence/${phase}-isolation.json`,
      JSON.stringify(isolation, null, 2),
    );
  };
  let failed = false;
  for (const [index, entry] of cases.entries()) {
    const caseId = `case-${String(index + 1).padStart(2, "0")}`;
    const titlePattern =
      entry.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$";
    const result = spawnSync(
      process.execPath,
      [...args, "--grep", titlePattern],
      {
        env: {
          ...process.env,
          RGAA_PHASE: phase,
          RGAA_CASE_ID: caseId,
        },
        stdio: "inherit",
      },
    );
    const record = {
      caseId,
      title: entry.title,
      exitCode: result.status,
      signal: result.signal,
    };
    isolation.cases.push(record);
    try {
      const report = JSON.parse(
        readFileSync(
          resolve(`evidence/${phase}-${caseId}-results.json`),
          "utf8",
        ),
      );
      const executed = specs(report.suites);
      if (executed.length !== 1 || executed[0].title !== entry.title)
        throw new Error(
          "The isolated report does not identify exactly the requested case.",
        );
      aggregate.suites.push(...report.suites);
      aggregate.errors.push(...report.errors);
      for (const key of ["expected", "skipped", "unexpected", "flaky"])
        aggregate.stats[key] += report.stats[key];
      if (report.stats.expected !== 1 || report.errors.length) failed = true;
    } catch (error) {
      failed = true;
      aggregate.errors.push({ message: `${caseId}: ${String(error)}` });
    }
    if (result.status !== 0) failed = true;
    persist();
  }
  if (aggregate.stats.expected !== cases.length) failed = true;
  process.exitCode = failed ? 1 : 0;
}
