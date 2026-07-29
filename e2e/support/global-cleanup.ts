import { chromium, type FullConfig } from "@playwright/test";
import { loginAs } from "../pom/auth";
import { ApiClient } from "../fixtures/api-client";
import { BASE_URL } from "./helpers";

/**
 * Nettoyage global des données de test.
 *
 * Tous les tests qui *créent* des données les préfixent par `E2E` (organisations `E2E/…`, tags
 * `e2e-…`, sources `E2E-…`, applications `E2E-…`). Ce `globalSetup` supprime, **avant chaque suite**,
 * tous les résidus `E2E` laissés par d'éventuels tests précédents (qui auraient oublié de nettoyer ou
 * auraient été interrompus). Résultat : la base reste propre d'un run à l'autre — on peut **rejouer
 * les tests à l'infini sans re-seed**.
 *
 * Robuste et non bloquant : si la stack n'est pas joignable, le nettoyage est ignoré (les tests
 * échoueront/se skipperont d'eux-mêmes), il ne fait jamais échouer le run.
 */
const E2E = /E2E/i;

/** Normalise une réponse de liste (tableau brut OU `{ results }` paginé) en tableau. */
function toList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  return (res as { results?: T[] } | null)?.results ?? [];
}

/** Parcourt toutes les pages d'un endpoint (pageSize 100 = max backend) et agrège les résultats. */
async function fetchAll<T>(
  fetchPage: (page: number) => Promise<unknown>,
  maxPages = 50,
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 0; page < maxPages; page += 1) {
    const items = toList<T>(await fetchPage(page).catch(() => null));
    all.push(...items);
    if (items.length < 100) break; // dernière page
  }
  return all;
}

export async function sweepE2EData(api: ApiClient): Promise<number> {
  let removed = 0;
  const drop = async (ok: Promise<boolean>) => {
    if (await ok.catch(() => false)) removed += 1;
  };

  // Organisations (recherche `E2E`, l'endpoint borne déjà à quelques résultats).
  const orgs = toList<{ id: string; path?: string }>(
    await api.organizations("E2E").catch(() => null),
  );
  for (const o of orgs) {
    if (E2E.test(o.path ?? "")) await drop(api.deleteOrganization(o.id));
  }

  // Tags (minuscules) : on pagine et on filtre côté client (la recherche serveur n'est pas fiable
  // pour un sweep, et `pageSize` est borné à 100 côté backend).
  const tags = await fetchAll<{ id: string; name?: string }>((page) =>
    api.tags(`pageSize=100&page=${page}`),
  );
  for (const t of tags) {
    if (E2E.test(t.name ?? "")) await drop(api.deleteTag(t.id));
  }

  // Sources de noms alternatifs.
  const sources = await fetchAll<{ id: string; source?: string }>((page) =>
    api.labelSources(`pageSize=100&page=${page}`),
  );
  for (const s of sources) {
    if (E2E.test(s.source ?? "")) await drop(api.deleteLabelSource(s.id));
  }

  // Applications de test (recherche `E2E` pour ne pas parcourir tout le catalogue).
  const apps = await fetchAll<{ id: string; label?: string }>((page) =>
    api.applications(`search=E2E&pageSize=100&page=${page}`),
  );
  for (const a of apps) {
    if (E2E.test(a.label ?? "")) await drop(api.deleteApplication(a.id));
  }

  // Catalogue de données : descriptions puis familles `E2E …` (#2117) — créées inline par les
  // cas DAT ; à balayer APRÈS les applications (le delete d'une description est bloqué tant
  // qu'un rattachement subsiste, et supprimer l'application hôte lève ce blocage).
  const descriptions =
    (await api.dataDescriptions("E2E").catch(() => null)) ?? [];
  for (const d of descriptions) {
    if (E2E.test(d.name ?? "")) await drop(api.deleteDataDescription(d.id));
  }
  const families = await api
    .dataFamilies("pageSize=100&page=0")
    .catch(() => null);
  for (const f of families?.results ?? []) {
    if (E2E.test(f.path ?? "")) await drop(api.deleteDataFamily(f.id));
  }

  return removed;
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const browser = await chromium.launch();
  try {
    // Le contexte doit porter `baseURL` : sinon les requêtes API relatives (`/api/v2/…`) de
    // `ApiClient` échouent (« Invalid URL ») hors d'un test.
    const context = await browser.newContext({ baseURL: BASE_URL });
    const page = await context.newPage();
    await loginAs(page, "admin");
    const api = await ApiClient.fromPage(page);
    const removed = await sweepE2EData(api);
    console.log(`[global-setup] résidus de test E2E nettoyés : ${removed}.`);
  } catch (error) {
    console.warn(
      `[global-setup] nettoyage ignoré : ${(error as Error).message}`,
    );
  } finally {
    await browser.close();
  }
}
