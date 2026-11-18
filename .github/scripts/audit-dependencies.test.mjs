import assert from "node:assert/strict";
import { test } from "node:test";
import {
  auditDependencies,
  validateAuditReport,
  validateWithdrawal,
} from "./audit-dependencies.mjs";

const id = "GHSA-fc5q-39xc-vjpf";
const now = new Date("2026-11-18T16:00:00Z");

function fixture() {
  const advisory = {
    github_advisory_id: id,
    module_name: "picomatch",
    severity: "high",
    url: `https://github.com/advisories/${id}`,
    findings: [{ version: "4.0.7", paths: [".>tool>picomatch"] }],
  };
  const report = {
    advisories: { 1247710: advisory },
    muted: [],
    metadata: {
      dependencies: 239,
      devDependencies: 0,
      optionalDependencies: 0,
      totalDependencies: 239,
      vulnerabilities: { info: 0, low: 0, moderate: 0, high: 1, critical: 0 },
    },
  };
  const official = {
    ghsa_id: id,
    url: `https://api.github.com/advisories/${id}`,
    html_url: `https://github.com/advisories/${id}`,
    withdrawn_at: "2026-11-18T15:38:56Z",
    vulnerabilities: [{ package: { ecosystem: "npm", name: "picomatch" } }],
  };
  return { advisory, report, official };
}
const resultFor = (report) => ({
  status: Object.values(report.advisories).some(
    ({ severity }) => severity !== "info",
  )
    ? 1
    : 0,
  stdout: JSON.stringify(report),
});
const response = (body, status = 200) => ({
  ok: status === 200,
  status,
  json: async () => body,
});

function options(report, official) {
  return {
    cwd: "/project",
    runner: () => resultFor(report),
    fetchImpl: async () => response(official),
    now,
    token: undefined,
  };
}

test("conserve l'audit standard au seuil low et consulte uniquement l'API GitHub canonique", async () => {
  const { report, official } = fixture();
  const raw = JSON.stringify(report, null, 2);
  const calls = [];
  const artifacts = [];
  const proofs = [];
  const result = await auditDependencies({
    ...options(report, official),
    token: "synthetic-test-token",
    runner: (...args) => {
      calls.push(args);
      return { status: 1, stdout: raw };
    },
    fetchImpl: async (url, init) => {
      assert.equal(url, `https://api.github.com/advisories/${id}`);
      assert.equal(init.redirect, "error");
      assert.equal(init.headers.Authorization, "Bearer synthetic-test-token");
      assert.ok(init.signal instanceof AbortSignal);
      return response(official);
    },
    onReport: (value) => artifacts.push(value),
    onOfficial: (value) => proofs.push(value),
  });
  assert.deepEqual(calls[0].slice(0, 2), [
    "pnpm",
    ["audit", "--json", "--audit-level=low"],
  ]);
  assert.equal(calls[0][2].cwd, "/project");
  assert.deepEqual(artifacts, [raw]);
  assert.deepEqual(proofs, [{ id, url: official.url, advisory: official }]);
  assert.deepEqual(result.withdrawals, [
    {
      id,
      package: "picomatch",
      withdrawnAt: official.withdrawn_at,
      url: official.html_url,
    },
  ]);
  assert.deepEqual(result.report, report);
});

test("ne consulte aucune API quand npm ne signale aucun avis", async () => {
  const { report } = fixture();
  report.advisories = {};
  report.metadata.vulnerabilities.high = 0;
  const result = await auditDependencies({
    ...options(report),
    fetchImpl: async () => {
      assert.fail("Aucune requête attendue");
    },
  });
  assert.deepEqual(result.withdrawals, []);
});

test("un avis info seul conserve le seuil low et ne déclenche aucune requête", async () => {
  const { report, advisory } = fixture();
  advisory.severity = "info";
  report.metadata.vulnerabilities.high = 0;
  report.metadata.vulnerabilities.info = 1;
  const result = await auditDependencies({
    ...options(report),
    fetchImpl: async () => {
      assert.fail("Aucune requête pour un avis info");
    },
  });
  assert.deepEqual(result.withdrawals, []);
  assert.equal(result.report.metadata.vulnerabilities.info, 1);
});

test("conserve le compteur info lorsque pnpm a filtré les advisories info au seuil low", async () => {
  const { report } = fixture();
  report.advisories = {};
  report.metadata.vulnerabilities.high = 0;
  report.metadata.vulnerabilities.info = 1;
  const result = await auditDependencies({
    ...options(report),
    fetchImpl: async () => {
      assert.fail("Aucune requête sous le seuil low");
    },
  });
  assert.deepEqual(result.withdrawals, []);
  assert.equal(result.report.metadata.vulnerabilities.info, 1);
});

test("un avis info ne dispense pas de bloquer un avis high actif", async () => {
  const { report, advisory, official } = fixture();
  report.advisories = {
    info: {
      ...advisory,
      github_advisory_id: "GHSA-c2qf-rxjj-qqgw",
      url: "https://github.com/advisories/GHSA-c2qf-rxjj-qqgw",
      severity: "info",
    },
    high: advisory,
  };
  report.metadata.vulnerabilities.info = 1;
  official.withdrawn_at = null;
  let calls = 0;
  await assert.rejects(
    auditDependencies({
      ...options(report, official),
      fetchImpl: async (url) => {
        calls++;
        assert.equal(url, official.url);
        return response(official);
      },
    }),
    /Avis de sécurité actif/,
  );
  assert.equal(calls, 1);
});

test("compte les deux versions affectées du backend sans confondre versions et nombre d'avis GHSA", async () => {
  const { report, official, advisory } = fixture();
  advisory.findings.push({ version: "2.3.2", paths: [".>jest>picomatch"] });
  report.metadata.vulnerabilities.high = 2;
  let calls = 0;
  const result = await auditDependencies({
    ...options(report, official),
    fetchImpl: async () => {
      calls++;
      return response(official);
    },
  });
  assert.equal(result.withdrawals.length, 1);
  assert.equal(calls, 1);
  assert.equal(result.report.metadata.vulnerabilities.high, 2);
});

test("refuse de gonfler les compteurs avec un constat de version dupliqué", () => {
  const { report, advisory } = fixture();
  advisory.findings.push(advisory.findings[0]);
  report.metadata.vulnerabilities.high = 2;
  assert.throws(
    () => validateAuditReport(resultFor(report)),
    /Version dupliquée/,
  );
});

test("refuse un avis toujours actif", async () => {
  const { report, official } = fixture();
  official.withdrawn_at = null;
  await assert.rejects(
    auditDependencies(options(report, official)),
    /Avis de sécurité actif/,
  );
});

test("un second avis actif fait échouer l'audit malgré le premier avis retiré", async () => {
  const { report, official, advisory } = fixture();
  const otherId = "GHSA-c2qf-rxjj-qqgw";
  report.advisories.other = {
    ...advisory,
    github_advisory_id: otherId,
    url: `https://github.com/advisories/${otherId}`,
  };
  report.metadata.vulnerabilities.high = 2;
  await assert.rejects(
    auditDependencies({
      ...options(report, official),
      fetchImpl: async (url) =>
        response(
          url.endsWith(id)
            ? official
            : {
                ...official,
                ghsa_id: otherId,
                url,
                html_url: `https://github.com/advisories/${otherId}`,
                withdrawn_at: null,
              },
        ),
    }),
    /Avis de sécurité actif/,
  );
});

test("vérifie chaque paquet d'un même GHSA tout en réutilisant sa réponse officielle", async () => {
  const { report, official, advisory } = fixture();
  report.advisories.other = { ...advisory, module_name: "other-package" };
  report.metadata.vulnerabilities.high = 2;
  let calls = 0;
  await assert.rejects(
    auditDependencies({
      ...options(report, official),
      fetchImpl: async () => {
        calls++;
        return response(official);
      },
    }),
    /paquet npm ne correspond pas/,
  );
  assert.equal(calls, 1);
});

for (const field of ["ghsa_id", "url", "html_url"]) {
  test(`refuse une identité officielle différente : ${field}`, () => {
    const { advisory, official } = fixture();
    official[field] = "https://untrusted.example/other";
    assert.throws(
      () => validateWithdrawal(advisory, official, now),
      /Identité ou URL officielle/,
    );
  });
}

for (const pkg of [
  { ecosystem: "npm", name: "other-package" },
  { ecosystem: "pip", name: "picomatch" },
  {},
]) {
  test(`refuse un paquet officiel divergent ou incomplet : ${JSON.stringify(pkg)}`, () => {
    const { advisory, official } = fixture();
    official.vulnerabilities = [{ package: pkg }];
    assert.throws(
      () => validateWithdrawal(advisory, official, now),
      /paquet npm ne correspond pas/,
    );
  });
}

for (const date of [
  undefined,
  "not-a-date",
  "2026-02-31T10:00:00Z",
  "2026-11-19T10:00:00Z",
  0,
]) {
  test(`refuse une date de retrait absente, invalide ou future : ${date}`, () => {
    const { advisory, official } = fixture();
    official.withdrawn_at = date;
    assert.throws(
      () => validateWithdrawal(advisory, official, now),
      /actif|Date de retrait officielle invalide/,
    );
  });
}

for (const status of [403, 404, 429, 500]) {
  test(`échoue si l'API officielle répond HTTP ${status}`, async () => {
    const { report } = fixture();
    await assert.rejects(
      auditDependencies({
        ...options(report),
        fetchImpl: async () => response({}, status),
      }),
      /officielle indisponible/,
    );
  });
}

test("échoue sur une erreur réseau ou un timeout sans utiliser de cache persistant", async () => {
  const { report } = fixture();
  for (const failure of [
    new Error("network"),
    new DOMException("deadline", "TimeoutError"),
  ]) {
    await assert.rejects(
      auditDependencies({
        ...options(report),
        fetchImpl: async () => {
          throw failure;
        },
      }),
      /officielle indisponible/,
    );
  }
});

test("échoue si l'API officielle ne renvoie pas du JSON valide", async () => {
  const { report } = fixture();
  await assert.rejects(
    auditDependencies({
      ...options(report),
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("invalid");
        },
      }),
    }),
    /officielle indisponible/,
  );
});

test("refuse un GHSA invalide ou une URL npm contradictoire avant toute requête", async () => {
  for (const field of ["github_advisory_id", "url"]) {
    const { report, advisory } = fixture();
    advisory[field] = "../../another-resource";
    await assert.rejects(
      auditDependencies({
        ...options(report),
        fetchImpl: async () => {
          assert.fail("Aucune requête attendue");
        },
      }),
      /Identité ou URL d'un avis npm invalide/,
    );
  }
});

test("refuse les erreurs de registre et les rapports absents ou malformés", () => {
  for (const stdout of [
    "{invalid",
    "null",
    "[]",
    JSON.stringify({ error: { code: "REGISTRY_UNAVAILABLE" } }),
    JSON.stringify({ advisories: {} }),
  ]) {
    assert.throws(
      () => validateAuditReport({ status: 1, stdout }),
      /JSON invalide|Rapport npm absent/,
    );
  }
});

test("refuse un outil absent, un signal et un code de sortie inexpliqué", () => {
  const { report } = fixture();
  for (const override of [
    { error: new Error("ENOENT"), status: null },
    { signal: "SIGTERM", status: null },
    { status: 2 },
  ]) {
    assert.throws(
      () => validateAuditReport({ ...resultFor(report), ...override }),
      /Échec de pnpm audit/,
    );
  }
});

test("refuse les compteurs de vulnérabilités tronqués ou des avis masqués", () => {
  for (const changed of ["count", "advisory", "extra", "muted", "missing"]) {
    const { report } = fixture();
    if (changed === "count") report.metadata.vulnerabilities.high = 0;
    if (changed === "advisory") report.advisories = {};
    if (changed === "extra") report.metadata.vulnerabilities.low = 1;
    if (changed === "muted") report.muted = [id];
    if (changed === "missing") delete report.metadata.vulnerabilities.high;
    assert.throws(
      () => validateAuditReport(resultFor(report)),
      /discordants|avis npm masqués/,
    );
  }
});

test("refuse les compteurs de dépendances incomplets, négatifs ou discordants", () => {
  for (const changed of ["missing", "negative", "total"]) {
    const { report } = fixture();
    if (changed === "missing") delete report.metadata.dependencies;
    if (changed === "negative") report.metadata.devDependencies = -1;
    if (changed === "total") report.metadata.totalDependencies = 238;
    assert.throws(
      () => validateAuditReport(resultFor(report)),
      /Compteurs de dépendances/,
    );
  }
});

test("refuse les avis sans constats ou dont les constats sont incomplets", () => {
  for (const findings of [
    [],
    undefined,
    [{}],
    [{ version: "4.0.7", paths: [] }],
  ]) {
    const { report, advisory } = fixture();
    advisory.findings = findings;
    assert.throws(
      () => validateAuditReport(resultFor(report)),
      /sans constat|Constat npm incomplet/,
    );
  }
});

test("refuse un code de sortie nul quand npm signale un avis", () => {
  const { report } = fixture();
  assert.throws(
    () => validateAuditReport({ ...resultFor(report), status: 0 }),
    /Compteurs npm discordants/,
  );
});
