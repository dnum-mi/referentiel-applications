/**
 * Bascule les items du board « Referentiel des applications (Features) » de la
 * colonne « Main » vers « Qualif » au moment où une release est publiée.
 *
 * Sémantique des colonnes concernées :
 *   Main   = mergé sur main, pas encore présent dans un tag ;
 *   Qualif = présent dans une release publiée, en attente de recette ;
 *   Done   = recette validée (jamais posé par ce script : c'est une décision humaine).
 *
 * Une release fait donc basculer tout le contenu de « Main » vers « Qualif » d'un
 * coup, sans avoir à rattacher chaque ticket à son commit : le tag vient d'être
 * créé depuis main, donc tout ce qui est mergé y est.
 *
 * Usage :
 *   node .github/scripts/board-sync.mjs             → applique la bascule
 *   node .github/scripts/board-sync.mjs --dry-run   → liste sans rien écrire
 *
 * Variables d'environnement :
 *   GH_TOKEN    (requis)  jeton ayant accès aux Projects de l'organisation.
 *                         Le `GITHUB_TOKEN` d'Actions ne convient PAS : il est
 *                         limité au dépôt et n'atteint pas les projets d'org.
 *   PROJECT_ID  (option)  identifiant du projet, par défaut le board 53.
 *   FROM_STATUS (option)  colonne de départ, par défaut « Main ».
 *   TO_STATUS   (option)  colonne d'arrivée, par défaut « Qualif ».
 *   DRY_RUN     (option)  « 1 » ou « true » pour ne rien écrire.
 */

const API = "https://api.github.com/graphql";

/** Board « Referentiel des applications (Features) » (projet n° 53 de l'organisation). */
const DEFAULT_PROJECT_ID = "PVT_kwDOBX4y9c4Avpth";

/** Lit une variable d'environnement obligatoire. */
function required(key) {
  const value = process.env[key];
  if (!value) throw new Error(`Variable d'environnement manquante : ${key}`);
  return value;
}

/**
 * Appelle l'API GraphQL.
 *
 * GraphQL répond « 200 OK » même sur une erreur métier, en la plaçant dans
 * `errors` : ne tester que le code HTTP laisserait passer un `data.node = null`
 * en silence, et le script conclurait « aucun item à déplacer ».
 */
async function graphql(token, query, variables = {}) {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GitHub GraphQL → ${res.status} ${text}`);
  const json = JSON.parse(text);
  if (json.errors?.length) {
    throw new Error(
      `GitHub GraphQL → ${json.errors.map((e) => e.message).join(" · ")}`,
    );
  }
  return json.data;
}

const FIELD_QUERY = `
  query($projectId: ID!) {
    node(id: $projectId) {
      ... on ProjectV2 {
        title
        field(name: "Status") {
          ... on ProjectV2SingleSelectField {
            id
            options { id name }
          }
        }
      }
    }
  }
`;

const ITEMS_QUERY = `
  query($projectId: ID!, $endCursor: String) {
    node(id: $projectId) {
      ... on ProjectV2 {
        items(first: 100, after: $endCursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            fieldValueByName(name: "Status") {
              ... on ProjectV2ItemFieldSingleSelectValue { name }
            }
            content {
              ... on Issue { number title }
              ... on PullRequest { number title }
              ... on DraftIssue { title }
            }
          }
        }
      }
    }
  }
`;

const UPDATE_MUTATION = `
  mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId
      itemId: $itemId
      fieldId: $fieldId
      value: { singleSelectOptionId: $optionId }
    }) { projectV2Item { id } }
  }
`;

/**
 * Résout le champ « Status » et ses options.
 *
 * Les identifiants d'options sont résolus par NOM à chaque exécution plutôt que
 * codés en dur : une colonne recréée depuis l'interface change d'identifiant, et
 * un identifiant périmé ferait échouer la mutation sans que l'on comprenne pourquoi.
 */
async function resolveStatusField(token, projectId, fromName, toName) {
  const data = await graphql(token, FIELD_QUERY, { projectId });
  const field = data.node?.field;
  if (!field) throw new Error("Champ « Status » introuvable sur ce projet.");

  const optionByName = (name) => {
    const option = field.options.find((o) => o.name === name);
    if (!option) {
      const connues = field.options.map((o) => o.name).join(" · ");
      throw new Error(`Colonne « ${name} » introuvable. Colonnes : ${connues}`);
    }
    return option;
  };

  return {
    projectTitle: data.node.title,
    fieldId: field.id,
    from: optionByName(fromName),
    to: optionByName(toName),
  };
}

/** Liste tous les items du projet, en suivant la pagination jusqu'au bout. */
async function listItems(token, projectId) {
  const items = [];
  let endCursor = null;
  do {
    const data = await graphql(token, ITEMS_QUERY, { projectId, endCursor });
    const page = data.node?.items;
    if (!page) throw new Error("Projet introuvable ou inaccessible.");
    items.push(...page.nodes);
    endCursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (endCursor);
  return items;
}

/** Libellé lisible d'un item, pour les journaux et le résumé de run. */
function describe(item) {
  const content = item.content;
  if (!content) return item.id;
  const titre = content.title ?? "(sans titre)";
  return content.number ? `#${content.number} ${titre}` : titre;
}

/** Ajoute une ligne au résumé de run GitHub Actions, s'il y en a un. */
async function summarize(lines) {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (!path) return;
  const { appendFile } = await import("node:fs/promises");
  await appendFile(path, `${lines.join("\n")}\n`);
}

async function main() {
  const token = required("GH_TOKEN");
  const projectId = process.env.PROJECT_ID ?? DEFAULT_PROJECT_ID;
  const fromName = process.env.FROM_STATUS ?? "Main";
  const toName = process.env.TO_STATUS ?? "Qualif";
  const dryRun =
    process.argv.includes("--dry-run") ||
    ["1", "true"].includes((process.env.DRY_RUN ?? "").toLowerCase());

  const { projectTitle, fieldId, from, to } = await resolveStatusField(
    token,
    projectId,
    fromName,
    toName,
  );
  const items = await listItems(token, projectId);
  const aDeplacer = items.filter(
    (item) => item.fieldValueByName?.name === from.name,
  );

  console.log(
    `${projectTitle} : ${items.length} items, ${aDeplacer.length} en « ${from.name} ».`,
  );
  if (aDeplacer.length === 0) {
    await summarize([`Board : aucun item en « ${from.name} », rien à faire.`]);
    return;
  }

  const resume = [
    `## Board — ${from.name} → ${to.name}`,
    "",
    `${aDeplacer.length} item(s)${dryRun ? " (simulation, rien écrit)" : ""} :`,
    "",
  ];

  for (const item of aDeplacer) {
    const libelle = describe(item);
    if (!dryRun) {
      // Mutation idempotente : rejouer le script ne provoque aucun dégât.
      await graphql(token, UPDATE_MUTATION, {
        projectId,
        itemId: item.id,
        fieldId,
        optionId: to.id,
      });
    }
    console.log(`${dryRun ? "[simulation] " : ""}${libelle} → ${to.name}`);
    resume.push(`- ${libelle}`);
  }

  await summarize(resume);
}

main().catch((error) => {
  console.error(`❌ Synchronisation du board impossible : ${error.message}`);
  process.exitCode = 1;
});
