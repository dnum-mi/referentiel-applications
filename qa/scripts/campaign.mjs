#!/usr/bin/env node
// Gère le cycle de vie des issues de campagne QA d'une version.
//
//   node qa/scripts/campaign.mjs open   → crée (si absentes) une issue [QA][vX.Y.Z] <domaine> par domaine
//                                          et écrit qa-campaign.json = [{ domain, prefix, issue }]
//   node qa/scripts/campaign.mjs close  → ferme toutes les issues ouvertes [QA][vX.Y.Z]
//
// Variables d'environnement : GITHUB_TOKEN, GITHUB_REPOSITORY, VERSION
// (VERSION sans le préfixe « v », ex. 1.79.0)

import { readFileSync, writeFileSync } from "node:fs";

const API = "https://api.github.com";
const token = required("GITHUB_TOKEN");
const repo = required("GITHUB_REPOSITORY");
const version = required("VERSION").replace(/^v/, "");
const [owner, name] = repo.split("/");

/** Domaines de campagne : ordre = ordre des issues. */
const DOMAINS = [
  {
    domain: "catalogue",
    prefix: "CAT",
    label: "Catalogue & recherche",
    template: "qa-catalogue.md",
    colorLabel: "qa:catalogue",
  },
  {
    domain: "fiche-application",
    prefix: "FIC",
    label: "Fiche application",
    template: "qa-fiche-application.md",
    colorLabel: "qa:fiche",
  },
  {
    domain: "permissions",
    prefix: "PRM",
    label: "Permissions & rôles",
    template: "qa-permissions.md",
    colorLabel: "qa:permissions",
  },
  {
    domain: "signalements-abonnements",
    prefix: "SIG",
    label: "Signalements & abonnements",
    template: "qa-signalements-abonnements.md",
    colorLabel: "qa:signalements",
  },
  {
    domain: "conformites",
    prefix: "CMP",
    label: "Conformités (éco-conception & homologation)",
    template: "qa-conformites.md",
    colorLabel: "qa:conformites",
  },
  {
    domain: "scope-acteurs",
    prefix: "SCP",
    label: "Périmètres admin & groupes d'acteurs",
    template: "qa-scope-acteurs.md",
    colorLabel: "qa:scope-acteurs",
  },
  {
    domain: "maia",
    prefix: "MAI",
    label: "Intégration MAIA",
    template: "qa-maia.md",
    colorLabel: "qa:maia",
  },
  {
    domain: "qualite-generale",
    prefix: "QAL",
    label: "Qualité générale",
    template: "qa-qualite-generale.md",
    colorLabel: "qa:qualite",
  },
  {
    domain: "historique",
    prefix: "HIS",
    label: "Historique des modifications",
    template: "qa-historique.md",
    colorLabel: "qa:historique",
  },
  {
    domain: "catalogue-filtres",
    prefix: "CSF",
    label: "Catalogue — filtres avancés",
    template: "qa-catalogue-filtres.md",
    colorLabel: "qa:catalogue-filtres",
  },
  {
    domain: "accueil",
    prefix: "ACC",
    label: "Accueil & chrome",
    template: "qa-accueil.md",
    colorLabel: "qa:accueil",
  },
  {
    domain: "time",
    prefix: "TIM",
    label: "Diagramme Time",
    template: "qa-time.md",
    colorLabel: "qa:time",
  },
  {
    domain: "transverse",
    prefix: "TRV",
    label: "Pages transverses",
    template: "qa-transverse.md",
    colorLabel: "qa:transverse",
  },
  {
    domain: "data-application",
    prefix: "DAT",
    label: "Détail d'une donnée",
    template: "qa-data-application.md",
    colorLabel: "qa:data-application",
  },
  {
    domain: "actions-crud",
    prefix: "CRU",
    label: "Actions CRUD de base",
    template: "qa-actions-crud.md",
    colorLabel: "qa:actions-crud",
  },
  {
    domain: "administration-referentiels",
    prefix: "ADM",
    label: "Administration des référentiels",
    template: "qa-administration-referentiels.md",
    colorLabel: "qa:administration-referentiels",
  },
  {
    domain: "profil-utilisateur",
    prefix: "PRF",
    label: "Profil utilisateur",
    template: "qa-profil-utilisateur.md",
    colorLabel: "qa:profil-utilisateur",
  },
];

function required(key) {
  const value = process.env[key];
  if (!value) throw new Error(`Variable d'environnement manquante : ${key}`);
  return value;
}

async function gh(path, init = {}) {
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

const titleFor = (label) => `[QA][v${version}] ${label}`;

/** Cherche une issue ouverte par titre exact. */
async function findOpenIssue(title) {
  const q = encodeURIComponent(
    `repo:${owner}/${name} is:issue is:open in:title "${title}"`,
  );
  const res = await gh(`/search/issues?q=${q}`);
  return res.items?.find((i) => i.title === title) ?? null;
}

/** Extrait les étapes (id, titre, action, attendu) du protocole d'un domaine. */
function stepsFromProtocol(domain) {
  const md = readFileSync(`qa/protocoles/${domain}.md`, "utf8");
  const blocks = md.split(/^###\s+/m).slice(1);
  const field = (block, label) => {
    const re = new RegExp(
      `-\\s+\\*\\*${label}\\*\\*\\s*:\\s*([\\s\\S]*?)(?=\\n-\\s+\\*\\*|\\n###|$)`,
    );
    const m = re.exec(block);
    return m
      ? m[1]
          .replace(/\s*\n\s*/g, " ")
          .trim()
          .replace(/\.$/, "")
      : "";
  };
  const steps = [];
  for (const block of blocks) {
    const head = /^([A-Z]{3}-\d+)\s+[—-]\s+([^\n]+)/.exec(block);
    if (!head) continue;
    steps.push({
      id: head[1],
      title: head[2].replace(/\s*✅\s*$/, "").trim(),
      action: field(block, "Action"),
      expected: field(block, "Résultat attendu"),
    });
  }
  return steps;
}

/** Rend la checklist de l'issue : titre + action + attendu + zone capture, par étape. */
function renderSteps(steps) {
  return steps
    .map((s) => {
      const out = [`- [ ] **${s.id}** — ${s.title}`];
      if (s.action) out.push(`  - **Action** : ${s.action}`);
      if (s.expected) out.push(`  - **Attendu** : ${s.expected}`);
      out.push(`  - 📎 _capture :_`);
      return out.join("\n");
    })
    .join("\n");
}

/** Corps de l'issue : template sans frontmatter, version injectée, checklist détaillée injectée. */
function issueBody(domain) {
  const raw = readFileSync(`.github/ISSUE_TEMPLATE/${domain.template}`, "utf8");
  const body = raw.replace(/^---[\s\S]*?---\n/, ""); // retire le frontmatter YAML
  return body
    .replace(/vX\.Y\.Z/g, `v${version}`)
    .replace(
      "<!-- qa-steps -->",
      `${renderSteps(stepsFromProtocol(domain.domain))}\n`,
    );
}

async function ensureLabel(label, color) {
  try {
    await gh(`/repos/${owner}/${name}/labels`, {
      method: "POST",
      body: JSON.stringify({ name: label, color }),
    });
  } catch {
    /* déjà existant */
  }
}

async function open() {
  const result = [];
  for (const d of DOMAINS) {
    const title = titleFor(d.label);
    let issue = await findOpenIssue(title);
    if (!issue) {
      for (const [lbl, color] of [
        ["qa", "1D76DB"],
        ["non-regression", "0E8A16"],
        [d.colorLabel, "C5DEF5"],
      ]) {
        await ensureLabel(lbl, color);
      }
      issue = await gh(`/repos/${owner}/${name}/issues`, {
        method: "POST",
        body: JSON.stringify({
          title,
          body: issueBody(d),
          labels: ["qa", "non-regression", d.colorLabel],
        }),
      });
      console.log(`Créée : #${issue.number} ${title}`);
    } else {
      console.log(`Réutilisée : #${issue.number} ${title}`);
    }
    result.push({
      domain: d.domain,
      prefix: d.prefix,
      label: d.label,
      issue: issue.number,
    });
  }
  writeFileSync("qa-campaign.json", JSON.stringify(result, null, 2));
  console.log(`qa-campaign.json écrit (${result.length} issues).`);

  if (process.env.PR_NUMBER) {
    // Non bloquant : un échec du commentaire ne doit pas faire échouer la campagne.
    try {
      await upsertPrComment(Number(process.env.PR_NUMBER), result);
    } catch (error) {
      console.warn(`Commentaire PR non posté : ${error.message}`);
    }
  }
}

const COMMENT_MARKER = "<!-- qa-campaign -->";

/** Poste (ou met à jour) un commentaire sur la PR listant les issues de campagne. */
async function upsertPrComment(prNumber, result) {
  const rows = result.map((r) => `| ${r.label} | #${r.issue} |`).join("\n");
  const body = [
    COMMENT_MARKER,
    `## 🧪 Campagne de non-régression — v${version}`,
    "",
    "| Domaine | Issue |",
    "| :------ | :---- |",
    rows,
    "",
    "> Remplies automatiquement (cases cochées + captures par étape + verdict `qa:pass`/`qa:fail`).",
    "> La sortie de version est bloquée si la non-régression échoue ; ces issues se ferment au merge.",
  ].join("\n");

  const comments = await gh(
    `/repos/${owner}/${name}/issues/${prNumber}/comments?per_page=100`,
  );
  const existing = comments.find((c) => c.body?.includes(COMMENT_MARKER));
  if (existing) {
    await gh(`/repos/${owner}/${name}/issues/comments/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify({ body }),
    });
    console.log(`Commentaire PR #${prNumber} mis à jour.`);
  } else {
    await gh(`/repos/${owner}/${name}/issues/${prNumber}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
    console.log(`Commentaire ajouté à la PR #${prNumber}.`);
  }
}

async function close() {
  for (const d of DOMAINS) {
    const issue = await findOpenIssue(titleFor(d.label));
    if (!issue) continue;
    await gh(`/repos/${owner}/${name}/issues/${issue.number}`, {
      method: "PATCH",
      body: JSON.stringify({ state: "closed", state_reason: "completed" }),
    });
    console.log(`Fermée : #${issue.number} ${issue.title}`);
  }
}

const command = process.argv[2];
const run = command === "open" ? open : command === "close" ? close : null;
if (!run) {
  console.error("Usage : node qa/scripts/campaign.mjs <open|close>");
  process.exit(1);
}
run().catch((error) => {
  console.error(error);
  process.exit(1);
});
