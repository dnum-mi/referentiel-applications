import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareIssueUpdate, statusesFromReport } from "./sync-issue.mjs";

const issueBody = `## Résumé

| Total | Réussis | Échecs | Non testés |
| --- | --- | --- | --- |
| 3 | 3 | 0 | 0 |

## Protocole

- [x] **SCP-01** Première étape
- [x] **SCP-02** Deuxième étape
- [x] **SCP-03** Troisième étape

## Bugs liés

Ancien diagnostic

## Verdict

- [x] \`qa:pass\`
- [ ] \`qa:fail\`
`;

function spec(id, status) {
  return {
    title: `${id} - scénario`,
    ok: status !== "failed",
    tests: [{ results: status ? [{ status }] : [] }],
  };
}

test("an aborted global setup publishes qa:fail while every scenario remains untested", () => {
  const diagnostic =
    "[global-setup] Fixtures QA obligatoires introuvables :\n" +
    "- application QA-SCOPE-TOTO\n- utilisateur scope-admin@example.com\n" +
    "Appliquer le seed principal puis `pnpm db:seed:qa` dans le backend.";
  const report = { suites: [], errors: [{ message: diagnostic }] };

  const update = prepareIssueUpdate(issueBody, report);

  assert.deepEqual(statusesFromReport(report), {});
  assert.equal(update.verdict, "qa:fail");
  assert.equal(update.runErrors, 1);
  assert.equal(update.passed, 0);
  assert.equal(update.failed, 0);
  assert.equal(update.notTested, 3);
  assert.equal(update.total, 3);
  assert.match(update.body, /\| 3 \| 0 \| 0 \| 3 \|/);
  assert.match(update.body, /- \[ \] `qa:pass`/);
  assert.match(update.body, /- \[x\] `qa:fail`/);
  assert.match(
    update.body,
    /Erreurs de préparation ou d'exécution hors scénario/,
  );
  assert.match(update.body, /application QA-SCOPE-TOTO/);
  assert.match(update.body, /utilisateur scope-admin@example.com/);
  assert.match(update.body, /pnpm db:seed:qa/);
  assert.doesNotMatch(update.body, /\*\*SCP-\d+\*\* — échec Playwright/);
  assert.doesNotMatch(update.body, /Aucune régression constatée/);
});

test("a successful rerun clears the preparation error and publishes qa:pass", () => {
  const previous = prepareIssueUpdate(issueBody, {
    suites: [],
    errors: [{ message: "Ancienne erreur de setup" }],
  });
  const update = prepareIssueUpdate(previous.body, {
    suites: [
      {
        specs: [
          spec("SCP-01", "passed"),
          spec("SCP-02", "passed"),
          spec("SCP-03", "skipped"),
        ],
      },
    ],
    errors: [],
  });

  assert.equal(update.verdict, "qa:pass");
  assert.equal(update.passed, 2);
  assert.equal(update.failed, 0);
  assert.equal(update.notTested, 1);
  assert.equal(update.runErrors, 0);
  assert.match(update.body, /\| 3 \| 2 \| 0 \| 1 \|/);
  assert.match(update.body, /- \[x\] `qa:pass`/);
  assert.match(update.body, /- \[ \] `qa:fail`/);
  assert.doesNotMatch(
    update.body,
    /Ancienne erreur de setup|Erreurs de préparation/,
  );
});

test("global errors retain completed outcomes and do not mark unexecuted specs as passed", () => {
  const update = prepareIssueUpdate(issueBody, {
    suites: [{ specs: [spec("SCP-01", "passed"), spec("SCP-02", undefined)] }],
    errors: [{ message: "Worker interrompu" }],
  });

  assert.equal(update.verdict, "qa:fail");
  assert.equal(update.passed, 1);
  assert.equal(update.failed, 0);
  assert.equal(update.notTested, 2);
  assert.match(update.body, /- \[x\] \*\*SCP-01\*\*/);
  assert.match(update.body, /- \[ \] \*\*SCP-02\*\*/);
  assert.match(update.body, /Worker interrompu/);
});

test("a failed scenario still publishes qa:fail without a global error", () => {
  const update = prepareIssueUpdate(issueBody, {
    suites: [
      {
        specs: [
          spec("SCP-01", "passed"),
          spec("SCP-02", "failed"),
          spec("SCP-03", "skipped"),
        ],
      },
    ],
  });

  assert.equal(update.verdict, "qa:fail");
  assert.equal(update.passed, 1);
  assert.equal(update.failed, 1);
  assert.equal(update.notTested, 1);
  assert.equal(update.runErrors, 0);
  assert.match(update.body, /\*\*SCP-02\*\* — échec Playwright/);
  assert.doesNotMatch(update.body, /Erreurs de préparation/);
});

test("setup diagnostics remain visible when the issue has no Bugs section", () => {
  const update = prepareIssueUpdate("- [ ] **SCP-01** Scénario", {
    suites: [],
    errors: [{ message: "Configuration indisponible" }],
  });

  assert.equal(update.verdict, "qa:fail");
  assert.equal(update.failed, 0);
  assert.equal(update.notTested, 1);
  assert.match(update.body, /## Bugs liés/);
  assert.match(update.body, /Configuration indisponible/);
});

test("a final Bugs section receives literal diagnostics without replacement-string interpolation", () => {
  const update = prepareIssueUpdate("## Bugs liés\nAncien diagnostic", {
    suites: [],
    errors: [
      { message: "Variable $1, capture $& et commande `pnpm db:seed:qa`" },
    ],
  });

  assert.match(update.body, /Variable \$1, capture \$&/);
  assert.doesNotMatch(update.body, /Ancien diagnostic/);
});

test("a shared report publishes only failures from the issue protocol domain", () => {
  const body = issueBody
    .replaceAll("SCP", "RGA")
    .replace(
      "Ancien diagnostic",
      "- **ACC-13** — ancien échec étranger\n- **ADM-08** — ancien échec étranger",
    );
  const update = prepareIssueUpdate(
    body,
    {
      suites: [
        {
          specs: [
            spec("RGA-01", "passed"),
            spec("RGA-02", "failed"),
            spec("RGA-03", "skipped"),
            spec("ACC-13", "failed"),
            spec("ADM-08", "failed"),
            spec("TIM-02", "failed"),
          ],
        },
      ],
    },
    {
      ids: new Set(["RGA-02", "ACC-13", "TIM-02"]),
      baseUrl: "https://example.test/captures",
    },
  );

  assert.equal(update.verdict, "qa:fail");
  assert.equal(update.passed, 1);
  assert.equal(update.failed, 1);
  assert.equal(update.notTested, 1);
  assert.equal(update.total, 3);
  assert.match(update.body, /\*\*RGA-02\*\* — échec Playwright/);
  assert.match(update.body, /https:\/\/example\.test\/captures\/RGA-02\.png/);
  assert.doesNotMatch(update.body, /ACC-13|ADM-08|TIM-02/);
});

test("foreign failures do not make a successful domain fail", () => {
  const update = prepareIssueUpdate(issueBody, {
    suites: [
      {
        specs: [
          spec("SCP-01", "passed"),
          spec("SCP-02", "passed"),
          spec("SCP-03", "passed"),
          spec("ACC-13", "failed"),
          spec("TIM-04", "failed"),
        ],
      },
    ],
  });

  assert.equal(update.verdict, "qa:pass");
  assert.equal(update.passed, 3);
  assert.equal(update.failed, 0);
  assert.match(update.body, /- \[x\] `qa:pass`/);
  assert.match(update.body, /Aucune régression constatée/);
  assert.doesNotMatch(update.body, /ACC-13|TIM-04/);
});

test("an unlisted failure of the same domain keeps qa:fail without inventing protocol counts", () => {
  const body = issueBody.replaceAll("SCP", "RGA");
  const update = prepareIssueUpdate(body, {
    suites: [
      {
        specs: [
          spec("RGA-01", "passed"),
          spec("RGA-02", "passed"),
          spec("RGA-03", "passed"),
          spec("RGA-16", "failed"),
          spec("ADM-23", "failed"),
        ],
      },
    ],
  });

  assert.equal(update.verdict, "qa:fail");
  assert.equal(update.total, 3);
  assert.equal(update.passed, 3);
  assert.equal(update.failed, 0);
  assert.equal(update.notTested, 0);
  assert.match(update.body, /\| 3 \| 3 \| 0 \| 0 \|/);
  assert.match(update.body, /\*\*RGA-16\*\* — échec Playwright/);
  assert.match(update.body, /- \[x\] `qa:fail`/);
  assert.doesNotMatch(update.body, /ADM-23|Aucune régression constatée/);
});

test("a protocol containing several domains retains failures from each represented prefix", () => {
  const body = issueBody.replace("**SCP-03**", "**ACC-01**");
  const update = prepareIssueUpdate(body, {
    suites: [
      {
        specs: [
          spec("SCP-01", "passed"),
          spec("SCP-02", "failed"),
          spec("ACC-01", "passed"),
          spec("ACC-13", "failed"),
          spec("TIM-06", "failed"),
        ],
      },
    ],
  });

  assert.equal(update.verdict, "qa:fail");
  assert.equal(update.total, 3);
  assert.equal(update.passed, 2);
  assert.equal(update.failed, 1);
  assert.match(update.body, /\*\*SCP-02\*\* — échec Playwright/);
  assert.match(update.body, /\*\*ACC-13\*\* — échec Playwright/);
  assert.doesNotMatch(update.body, /TIM-06/);
});

test("global run errors remain visible when all scenario failures belong to other domains", () => {
  const update = prepareIssueUpdate(issueBody, {
    suites: [
      {
        specs: [
          spec("SCP-01", "passed"),
          spec("SCP-02", "passed"),
          spec("SCP-03", "passed"),
          spec("TIM-06", "failed"),
        ],
      },
    ],
    errors: [{ message: "Worker interrompu après les scénarios du domaine" }],
  });

  assert.equal(update.verdict, "qa:fail");
  assert.equal(update.failed, 0);
  assert.equal(update.runErrors, 1);
  assert.match(update.body, /Worker interrompu après les scénarios du domaine/);
  assert.match(
    update.body,
    /Erreurs de préparation ou d'exécution hors scénario/,
  );
  assert.doesNotMatch(update.body, /TIM-06|Aucune régression constatée/);
});
