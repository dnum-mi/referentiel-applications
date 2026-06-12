#!/usr/bin/env node
// Synchronise une issue de campagne QA à partir d'un rapport Playwright JSON.
// Coche les étapes dont le test (titre = `XXX-NN ...`) est passé, met à jour le tableau
// récapitulatif et pose le label de verdict `qa:pass` / `qa:fail`.
//
// Variables d'environnement attendues :
//   GITHUB_TOKEN          jeton avec droit d'écriture sur les issues
//   GITHUB_REPOSITORY     "owner/repo"
//   ISSUE_NUMBER          numéro de l'issue de campagne à mettre à jour
//   RESULTS_FILE          chemin du rapport Playwright JSON (défaut: results.json)
//   SCREENSHOTS_DIR       (optionnel) dossier des screenshots `<ID>.png`
//   SCREENSHOTS_BASE_URL  (optionnel) URL de base où sont publiés les screenshots
//
// Usage : node qa/scripts/sync-issue.mjs

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const API = "https://api.github.com";
const STEP_ID = /\b([A-Z]{3}-\d+)\b/;

function required(key) {
  const value = process.env[key];
  if (!value) throw new Error(`Variable d'environnement manquante : ${key}`);
  return value;
}

async function gh(token, path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!res.ok)
    throw new Error(`GitHub API ${path} → ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

/** Aplati le rapport Playwright en map { "CAT-01": "passed" | "failed" | "skipped" }. */
export function statusesFromReport(report) {
  const specs = [];
  const walk = (suite) => {
    for (const s of suite.suites ?? []) walk(s);
    for (const spec of suite.specs ?? []) specs.push(spec);
  };
  for (const suite of report.suites ?? []) walk(suite);

  const byId = {};
  for (const spec of specs) {
    const match = STEP_ID.exec(spec.title ?? "");
    if (!match) continue;
    const id = match[1];
    const results = (spec.tests ?? []).flatMap((t) => t.results ?? []);
    const allSkipped =
      results.length > 0 && results.every((r) => r.status === "skipped");
    const status = allSkipped ? "skipped" : spec.ok ? "passed" : "failed";
    // En cas de doublon d'ID, un échec prime sur un succès.
    if (byId[id] !== "failed") byId[id] = status;
  }
  return byId;
}

// Construit dynamiquement (via le code 27 = ESC) pour éviter un caractère de contrôle
// littéral dans une regex, interdit par la règle ESLint `no-control-regex`.
const ANSI_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

/** Nettoie un message d'erreur Playwright (codes ANSI, multi-ligne) en un court extrait. */
function cleanError(message) {
  return String(message ?? "échec")
    .replace(ANSI_PATTERN, "") // codes couleur ANSI
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" — ")
    .slice(0, 300);
}

/** Extrait, par ID d'étape en échec, le message d'erreur Playwright. */
export function failuresFromReport(report) {
  const specs = [];
  const walk = (suite) => {
    for (const s of suite.suites ?? []) walk(s);
    for (const spec of suite.specs ?? []) specs.push(spec);
  };
  for (const suite of report.suites ?? []) walk(suite);

  const byId = {};
  for (const spec of specs) {
    const match = STEP_ID.exec(spec.title ?? "");
    if (!match || spec.ok) continue;
    const results = (spec.tests ?? []).flatMap((t) => t.results ?? []);
    if (results.length > 0 && results.every((r) => r.status === "skipped"))
      continue; // skip légitime, pas un bug
    const errored =
      results.find((r) => r.status === "failed" || r.status === "timedOut") ??
      results[results.length - 1];
    const message =
      errored?.error?.message ?? errored?.errors?.[0]?.message ?? "échec";
    byId[match[1]] = cleanError(message);
  }
  return byId;
}

/** Rend la section « Bugs liés » à partir des échecs (avec lien capture si dispo). */
function renderBugs(failures, screenshots) {
  const ids = Object.keys(failures).sort();
  if (ids.length === 0)
    return "_Aucune régression constatée (suite automatisée)._";
  return ids
    .map((id) => {
      const cap = screenshots?.ids.has(id)
        ? ` — [capture](${screenshots.baseUrl.replace(/\/$/, "")}/${id}.png)`
        : "";
      return `- **${id}** — échec Playwright : ${failures[id]}${cap}`;
    })
    .join("\n");
}

/** Remplace le contenu de la section « Bugs liés » par le rapport d'échecs. */
export function setBugsSection(body, failures, screenshots) {
  if (!/## Bugs liés\n/.test(body)) return body;
  return body.replace(
    /(## Bugs liés\n)[\s\S]*?(?=\n## )/,
    `$1\n${renderBugs(failures, screenshots)}\n`,
  );
}

/**
 * Coche/laisse chaque ligne d'étape selon le statut, et embarque le screenshot de l'étape sous la
 * ligne `📎` quand il existe. `screenshots` = { ids: Set<string>, baseUrl: string } | null.
 * Renvoie { body, passed, failed, total }.
 */
export function applyStatuses(body, statuses, screenshots = null) {
  let passed = 0;
  let failed = 0;
  let total = 0;
  let currentId = null;

  const lines = body.split("\n").map((line) => {
    const stepLine = /^(\s*-\s*)\[[ xX]\](\s*\*\*([A-Z]{3}-\d+)\*\*.*)$/.exec(
      line,
    );
    if (stepLine) {
      total += 1;
      currentId = stepLine[3];
      const status = statuses[currentId];
      if (status === "passed") {
        passed += 1;
        return `${stepLine[1]}[x]${stepLine[2]}`;
      }
      if (status === "failed") failed += 1;
      // failed / skipped / non automatisé → on laisse décoché (rapport honnête).
      return `${stepLine[1]}[ ]${stepLine[2]}`;
    }

    // Ligne « capture » de l'étape courante : on y injecte le screenshot s'il existe.
    const captureLine = /^(\s*)-\s*📎/.exec(line);
    if (captureLine && currentId && screenshots?.ids.has(currentId)) {
      // Cache-bust (`?v=<sha>`) : l'URL change à chaque commit → pas d'image périmée en cache,
      // alors que le fichier lui-même est écrasé au même chemin sur la branche qa-screenshots.
      const bust = screenshots.bust ? `?v=${screenshots.bust}` : "";
      const url = `${screenshots.baseUrl.replace(/\/$/, "")}/${currentId}.png${bust}`;
      return `${captureLine[1]}- 📎 ![${currentId}](${url})`;
    }
    return line;
  });

  const notTested = total - passed - failed;
  const withRecap = updateRecap(lines.join("\n"), {
    total,
    passed,
    failed,
    notTested,
  });
  const updated = setVerdict(withRecap, failed);
  return { body: updated, passed, failed, total };
}

/** Coche la case de verdict : `qa:pass` si aucun échec, sinon `qa:fail`. */
function setVerdict(body, failed) {
  return body
    .split("\n")
    .map((line) => {
      const m = /^(\s*-\s*\[)[ xX](\]\s*`qa:(pass|fail)`.*)$/.exec(line);
      if (!m) return line;
      const checked =
        (m[3] === "pass" && failed === 0) || (m[3] === "fail" && failed > 0);
      return `${m[1]}${checked ? "x" : " "}${m[2]}`;
    })
    .join("\n");
}

/** Met à jour la 1ʳᵉ ligne de données du tableau récapitulatif. */
function updateRecap(body, { total, passed, failed, notTested }) {
  let seenHeaderSep = false;
  return body
    .split("\n")
    .map((line) => {
      if (/^\|[\s-:|]+\|$/.test(line)) {
        seenHeaderSep = true;
        return line;
      }
      if (seenHeaderSep && /^\|.*\|.*\|.*\|.*\|$/.test(line)) {
        seenHeaderSep = false;
        return `| ${total} | ${passed} | ${failed} | ${notTested} |`;
      }
      return line;
    })
    .join("\n");
}

/** Liste les IDs d'étape ayant un screenshot (`<id>.png`) dans le dossier donné. */
function screenshotIds(dir) {
  try {
    return new Set(
      readdirSync(dir)
        .filter((f) => f.endsWith(".png"))
        .map((f) => f.replace(/\.png$/, "")),
    );
  } catch {
    return new Set();
  }
}

/** Pose un label sur l'issue, en le créant d'abord s'il n'existe pas (tolérant aux erreurs). */
async function addLabel(token, owner, name, issueNumber, label, color) {
  try {
    await gh(token, `/repos/${owner}/${name}/labels`, {
      method: "POST",
      body: JSON.stringify({ name: label, color }),
    });
  } catch {
    // label déjà existant (422) ou droit manquant : non bloquant
  }
  try {
    await gh(token, `/repos/${owner}/${name}/issues/${issueNumber}/labels`, {
      method: "POST",
      body: JSON.stringify({ labels: [label] }),
    });
  } catch (error) {
    console.warn(`Label "${label}" non posé : ${error.message}`);
  }
}

async function main() {
  const token = required("GITHUB_TOKEN");
  const repo = required("GITHUB_REPOSITORY");
  const issueNumber = required("ISSUE_NUMBER");
  const resultsFile = process.env.RESULTS_FILE ?? "results.json";
  const screenshotsDir = process.env.SCREENSHOTS_DIR;
  const screenshotsBaseUrl = process.env.SCREENSHOTS_BASE_URL;
  const [owner, name] = repo.split("/");

  const report = JSON.parse(readFileSync(resultsFile, "utf8"));
  const statuses = statusesFromReport(report);
  console.log(`Statuts par étape :`, statuses);

  const screenshots =
    screenshotsDir && screenshotsBaseUrl
      ? {
          ids: screenshotIds(screenshotsDir),
          baseUrl: screenshotsBaseUrl,
          bust: process.env.SCREENSHOTS_CACHE_BUST,
        }
      : null;
  if (screenshots)
    console.log(
      `Screenshots embarqués :`,
      [...screenshots.ids].join(", ") || "(aucun)",
    );

  const issue = await gh(
    token,
    `/repos/${owner}/${name}/issues/${issueNumber}`,
  );
  const { body, passed, failed, total } = applyStatuses(
    issue.body ?? "",
    statuses,
    screenshots,
  );
  // Reporte les échecs Playwright dans la section « Bugs liés ».
  const withBugs = setBugsSection(
    body,
    failuresFromReport(report),
    screenshots,
  );

  await gh(token, `/repos/${owner}/${name}/issues/${issueNumber}`, {
    method: "PATCH",
    body: JSON.stringify({ body: withBugs }),
  });

  const verdict = failed > 0 ? "qa:fail" : "qa:pass";
  await addLabel(
    token,
    owner,
    name,
    issueNumber,
    verdict,
    failed > 0 ? "B60205" : "0E8A16",
  );

  console.log(
    `Issue #${issueNumber} synchronisée : ${passed}/${total} passés, ${failed} échecs → ${verdict}`,
  );
}

// N'exécute le flux réseau que lorsque le script est lancé directement (pas à l'import/aux tests).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
