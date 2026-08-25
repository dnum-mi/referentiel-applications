/**
 * Compare le contrat OpenAPI committé (frontend/openapi/swagger.yaml) à celui
 * réellement exposé par le backend en cours d'exécution.
 *
 * Le fichier committé est la seule source du client TypeScript du frontend :
 * il est régénéré par openapi-ts en CI (job e2e, code-scan) et au build de
 * l'image frontend, alors que `frontend/src/client` est gitignoré. S'il dérive,
 * le client livré décrit une API qui n'existe pas.
 *
 * Exécuté DANS le conteneur backend : `yaml` y est déjà installé et l'API est
 * joignable sur localhost. Le fichier committé est copié en /app/committed.yaml
 * par le workflow. Extension .mjs : le backend est compilé en CommonJS, ce
 * fichier a besoin des imports ESM (`require` est interdit par ESLint).
 *
 * La comparaison est sémantique (YAML parsé vs JSON servi) : le fichier
 * committé utilise des ancres YAML pour les objets `tags` partagés, que le
 * passage par JSON aplatit. L'ordre des clés, lui, est bien comparé.
 */
import { readFileSync } from "node:fs";
import { get } from "node:http";
import { parse } from "yaml";

const COMMITTED_PATH = process.env.COMMITTED_SWAGGER ?? "/app/committed.yaml";
const LIVE_URL =
  process.env.LIVE_SWAGGER_URL ?? "http://localhost:3500/api/v2/swagger/json";

function fetchLiveDocument() {
  return new Promise((resolve, reject) => {
    get(LIVE_URL, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`${LIVE_URL} a répondu ${res.statusCode}`));
        return;
      }
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(
            new Error(`Réponse illisible de ${LIVE_URL} : ${error.message}`),
          );
        }
      });
    }).on("error", reject);
  });
}

function reportKeyDrift(label, committed, live) {
  const onlyCommitted = Object.keys(committed).filter((key) => !(key in live));
  const onlyLive = Object.keys(live).filter((key) => !(key in committed));

  for (const key of onlyCommitted) {
    console.error(`  - ${label} committé mais absent du backend : ${key}`);
  }
  for (const key of onlyLive) {
    console.error(
      `  + ${label} exposé par le backend mais absent du fichier : ${key}`,
    );
  }

  return onlyCommitted.length + onlyLive.length;
}

async function main() {
  const live = await fetchLiveDocument();
  const committed = parse(readFileSync(COMMITTED_PATH, "utf8"));

  if (JSON.stringify(committed) === JSON.stringify(live)) {
    console.log(
      "✅ frontend/openapi/swagger.yaml correspond à l'API exposée par le backend.",
    );
    return;
  }

  console.error(
    "❌ frontend/openapi/swagger.yaml ne correspond plus à l'API exposée par le backend.",
  );
  console.error("");

  const named =
    reportKeyDrift("Endpoint", committed.paths ?? {}, live.paths ?? {}) +
    reportKeyDrift(
      "Schéma",
      committed.components?.schemas ?? {},
      live.components?.schemas ?? {},
    );

  if (named === 0) {
    console.error(
      "  Aucun endpoint ni schéma ajouté ou supprimé : la différence porte sur le détail d'une définition (type, enum, description…).",
    );
  }

  console.error("");
  console.error(
    "Pour corriger : régénérer le contrat depuis le backend, puis committer le fichier.",
  );
  console.error(
    "  docker compose exec backend npx prisma generate   # le swagger dérive des enums Prisma",
  );
  console.error(
    "  docker compose restart backend                    # réécrit frontend/openapi/swagger.yaml",
  );
  console.error(
    "  pnpm --dir frontend api:generate                  # régénère le client TypeScript",
  );
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(`❌ Vérification impossible : ${error.message}`);
  process.exitCode = 1;
});
