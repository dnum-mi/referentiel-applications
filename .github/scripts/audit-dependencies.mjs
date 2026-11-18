import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const levels = ["info", "low", "moderate", "high", "critical"];
const ghsaPattern = /^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/;
const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** Les compteurs bruts permettent aussi de détecter un avis masqué par une configuration pnpm. */
export function validateAuditReport(result) {
  if (result.error || result.signal || ![0, 1].includes(result.status))
    throw new Error(
      "Échec de pnpm audit : outil, registre ou délai indisponible.",
    );
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    throw new Error("Rapport npm : JSON invalide.");
  }
  if (
    !isRecord(report) ||
    report.error !== undefined ||
    !isRecord(report.advisories) ||
    !isRecord(report.metadata)
  ) {
    throw new Error("Rapport npm absent, tronqué ou en erreur.");
  }
  const metadata = report.metadata;
  if (
    !isRecord(metadata.vulnerabilities) ||
    !Array.isArray(report.muted) ||
    report.muted.length
  )
    throw new Error("Compteurs absents ou avis npm masqués.");
  const dependencyCounts = [
    metadata.dependencies,
    metadata.devDependencies,
    metadata.optionalDependencies,
    metadata.totalDependencies,
  ];
  if (
    dependencyCounts.some(
      (value) => !Number.isSafeInteger(value) || value < 0,
    ) ||
    dependencyCounts[3] !==
      dependencyCounts.slice(0, 3).reduce((sum, value) => sum + value, 0)
  ) {
    throw new Error("Compteurs de dépendances npm incohérents.");
  }
  const advisories = Object.values(report.advisories);
  const counts = Object.fromEntries(levels.map((level) => [level, 0]));
  for (const advisory of advisories) {
    if (
      !isRecord(advisory) ||
      typeof advisory.github_advisory_id !== "string" ||
      !ghsaPattern.test(advisory.github_advisory_id) ||
      typeof advisory.module_name !== "string" ||
      !advisory.module_name.trim() ||
      !levels.includes(advisory.severity) ||
      advisory.url !==
        `https://github.com/advisories/${advisory.github_advisory_id}`
    ) {
      throw new Error("Identité ou URL d'un avis npm invalide.");
    }
    if (!Array.isArray(advisory.findings) || !advisory.findings.length)
      throw new Error("Avis npm sans constat vérifiable.");
    const versions = new Set();
    for (const finding of advisory.findings) {
      if (
        !isRecord(finding) ||
        typeof finding.version !== "string" ||
        !finding.version ||
        !Array.isArray(finding.paths) ||
        !finding.paths.length ||
        finding.paths.some((path) => typeof path !== "string" || !path.trim())
      ) {
        throw new Error("Constat npm incomplet.");
      }
      if (versions.has(finding.version))
        throw new Error("Version dupliquée dans les constats npm.");
      versions.add(finding.version);
    }
    counts[advisory.severity] += versions.size;
  }
  const expectedStatus = levels.some(
    (level) => level !== "info" && counts[level] > 0,
  )
    ? 1
    : 0;
  if (
    result.status !== expectedStatus ||
    Object.keys(metadata.vulnerabilities).some(
      (level) => !levels.includes(level),
    ) ||
    levels.some((level) => {
      const count = metadata.vulnerabilities[level];
      // pnpm peut retirer les avis info du JSON au seuil low, en gardant leur compteur.
      if (level === "info" && counts.info === 0)
        return !Number.isSafeInteger(count) || count < 0;
      return count !== counts[level];
    })
  ) {
    throw new Error(
      "Compteurs npm discordants : avis masqué ou rapport tronqué.",
    );
  }
  return {
    report,
    advisories: advisories.filter(({ severity }) => severity !== "info"),
  };
}

export function validateWithdrawal(advisory, official, now = new Date()) {
  const id = advisory.github_advisory_id;
  const url = `https://api.github.com/advisories/${id}`;
  const htmlUrl = `https://github.com/advisories/${id}`;
  if (
    !isRecord(official) ||
    official.ghsa_id !== id ||
    official.url !== url ||
    official.html_url !== htmlUrl
  ) {
    throw new Error(`Identité ou URL officielle incohérente pour ${id}.`);
  }
  if (
    !Array.isArray(official.vulnerabilities) ||
    !official.vulnerabilities.length ||
    official.vulnerabilities.some(
      (entry) =>
        !isRecord(entry) ||
        !isRecord(entry.package) ||
        typeof entry.package.ecosystem !== "string" ||
        typeof entry.package.name !== "string",
    ) ||
    !official.vulnerabilities.some(
      (entry) =>
        entry.package.ecosystem === "npm" &&
        entry.package.name === advisory.module_name,
    )
  ) {
    throw new Error(`Le paquet npm ne correspond pas à l'avis officiel ${id}.`);
  }
  const withdrawnAt = official.withdrawn_at;
  if (withdrawnAt === null || withdrawnAt === undefined)
    throw new Error(
      `Avis de sécurité actif : ${id} (${advisory.module_name}).`,
    );
  const date =
    typeof withdrawnAt === "string" ? new Date(withdrawnAt) : new Date(NaN);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(withdrawnAt) ||
    !Number.isFinite(date.getTime()) ||
    !Number.isFinite(now.getTime()) ||
    date.toISOString().slice(0, 19) !== withdrawnAt.slice(0, 19) ||
    date > now
  ) {
    throw new Error(
      `Date de retrait officielle invalide ou future pour ${id}.`,
    );
  }
  return { id, package: advisory.module_name, withdrawnAt, url: htmlUrl };
}

/** Vérifie uniquement les avis signalés par npm ; une indisponibilité de la source officielle bloque l'audit. */
export async function auditDependencies({
  cwd = process.cwd(),
  runner = spawnSync,
  fetchImpl = fetch,
  token = process.env.GITHUB_TOKEN,
  now = new Date(),
  onReport = () => {},
  onOfficial = () => {},
} = {}) {
  const result = runner("pnpm", ["audit", "--json", "--audit-level=low"], {
    cwd,
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (typeof result.stdout === "string") onReport(result.stdout);
  const { report, advisories } = validateAuditReport(result);
  const withdrawals = [];
  const cache = new Map();
  for (const advisory of advisories) {
    const id = advisory.github_advisory_id;
    const url = `https://api.github.com/advisories/${id}`;
    if (!cache.has(id)) {
      let official;
      try {
        const response = await fetchImpl(url, {
          headers: {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          redirect: "error",
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok || response.status !== 200)
          throw new Error("Réponse HTTP non réussie");
        official = await response.json();
      } catch {
        throw new Error(`Vérification officielle indisponible pour ${id}.`);
      }
      onOfficial({ id, url, advisory: official });
      cache.set(id, official);
    }
    withdrawals.push(validateWithdrawal(advisory, cache.get(id), now));
  }
  return { report, withdrawals };
}

function writeArtifact(path, value) {
  if (!path) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const officialResponses = [];
  try {
    const { withdrawals } = await auditDependencies({
      onReport: (raw) => writeArtifact(process.env.AUDIT_REPORT_PATH, raw),
      onOfficial: (proof) => {
        officialResponses.push(proof);
        writeArtifact(
          process.env.AUDIT_OFFICIAL_REPORT_PATH,
          JSON.stringify(officialResponses, null, 2) + "\n",
        );
      },
    });
    if (!withdrawals.length)
      console.log("Audit npm : aucun avis au seuil low.");
    for (const withdrawal of withdrawals)
      console.log(
        `Avis npm retiré officiellement : ${withdrawal.id} (${withdrawal.package}), le ${withdrawal.withdrawnAt}. Source : ${withdrawal.url}`,
      );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
