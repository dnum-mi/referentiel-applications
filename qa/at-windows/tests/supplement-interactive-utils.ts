import { expect, type Page, type TestInfo } from "@playwright/test";
import {
  alpha,
  mountProductionScene,
  simulatedNetwork,
} from "./interactive-utils.js";
import {
  mountRemainingScene,
  simulatedRemainingNetwork,
} from "./remaining-interactive-utils.js";
import {
  appFixtureIds,
  mountApplicationScene,
  simulatedApplicationNetwork,
} from "./application-interactive-utils.js";
import { setupU13 } from "./admin-users-interactive-utils.js";
import { generalNetwork } from "./general-interactive-utils.js";
import { mountSharedScene, sharedNetwork } from "./shared-interactive-utils.js";

export type SupplementKind =
  | "wizard"
  | "actor"
  | "actor-bulk"
  | "technology"
  | "data"
  | "inline"
  | "compliances"
  | "filters"
  | "info";
export type ReplyKey =
  | "maia"
  | "wizard"
  | "wizard-actor"
  | "actor"
  | "bulk"
  | "technology"
  | "family"
  | "data"
  | "exposure"
  | "inline"
  | "eco"
  | "rgaa"
  | "rgaa-delete"
  | "filter"
  | "filter-delete"
  | "label"
  | "hosting";
type BaseNetwork = { base: string; calls: unknown[]; unhandled: unknown[] };
export const supplementIds = {
  technology: "technology-known-synthetic",
  rgaa: "rgaa-existing-synthetic",
  exposure: "exposure-existing-synthetic",
  saved: "saved-g7-existing",
};
const org = {
  id: "org-synthetic-001",
  path: "Test/Organisation synthétique",
  label: "Organisation synthétique",
  parentId: null,
};
const description = {
  id: appFixtureIds.description,
  name: "Donnee existante AT",
  description: "Description initiale AT",
  officialUrl: "",
  families: [{ id: appFixtureIds.family, path: "Test/Famille fictive" }],
  tags: [] as { id: string; name: string }[],
  applicationsSource: [] as { id: string; label: string }[],
  dataApplications: [],
};

function bodyObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Objet de requête fictive attendu");
  return value as Record<string, unknown>;
}

export async function prepareSupplement(page: Page, kind: SupplementKind) {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  let base: BaseNetwork;
  let borrowedCalls: () => unknown[] = () => [];
  let setBorrowedMode: (
    key: ReplyKey,
    mode: "error" | "success",
  ) => void = () => {};
  if (kind === "actor-bulk") {
    const current = await setupU13(page, "actor");
    base = current;
    borrowedCalls = () => current.u13Calls;
  } else if (kind === "wizard" || kind === "compliances") {
    const current = await simulatedRemainingNetwork(page);
    base = current;
    borrowedCalls = () => current.remainingCalls;
  } else if (["actor", "technology", "data"].includes(kind)) {
    const current = await simulatedApplicationNetwork(page);
    base = current;
    borrowedCalls = () => current.applicationCalls;
  } else if (kind === "info") {
    const current = await generalNetwork(page);
    base = current;
    borrowedCalls = () => [...current.generalCalls, ...current.operationsCalls];
    setBorrowedMode = (key, mode) => {
      if (key === "label") current.generalState.label = mode;
      if (key === "hosting") current.generalState.hosting = mode;
    };
  } else if (kind === "filters") {
    const current = await sharedNetwork(page);
    base = current;
    borrowedCalls = () => current.extraCalls;
  } else base = await simulatedNetwork(page);
  const modes = Object.fromEntries(
    [
      "maia",
      "wizard",
      "wizard-actor",
      "actor",
      "bulk",
      "technology",
      "family",
      "data",
      "exposure",
      "inline",
      "eco",
      "rgaa",
      "rgaa-delete",
      "filter",
      "filter-delete",
      "label",
      "hosting",
    ].map((key) => [key, "success"]),
  ) as Record<ReplyKey, "error" | "success">;
  const held = new Set<ReplyKey>();
  const pending: { key: ReplyKey; release(): void }[] = [];
  const started: { method: string; path: string; body?: unknown }[] = [];
  const replies: {
    method: string;
    path: string;
    status: number;
    body?: unknown;
  }[] = [];
  const pause = async (key: ReplyKey) => {
    if (held.has(key))
      await new Promise<void>((release) => pending.push({ key, release }));
  };
  const release = (key: ReplyKey) => {
    held.delete(key);
    for (let index = pending.length - 1; index >= 0; index--)
      if (pending[index].key === key) pending.splice(index, 1)[0].release();
  };
  const mode = (key: ReplyKey, value: "error" | "success") => {
    modes[key] = value;
    setBorrowedMode(key, value);
  };
  let actors: Record<string, unknown>[] = [
    {
      id: appFixtureIds.actor,
      applicationId: alpha,
      actorTypeId: appFixtureIds.actorType,
      email: "acteur@example.invalid",
      firstname: "Camille",
      lastname: "Fictif",
      organizationId: org.id,
      isGroup: false,
    },
  ];
  let technologies: Record<string, unknown>[] = [
    {
      id: supplementIds.technology,
      applicationId: alpha,
      technology: "Base connue AT",
      product: "PostgreSQL",
      version: "16",
      docUrl: "https://docs.example.invalid",
      eolSource: "endoflife.date",
      eolProduct: "postgresql",
      eolCycle: "16",
      eolDate: "2027-11-09T00:00:00.000Z",
      eolCheckedAt: "2026-10-13T00:00:00.000Z",
      eolStatus: null,
      eoasDate: null,
    },
  ];
  let families = [...description.families];
  let dataDescription = { ...description };
  let exposures: Record<string, unknown>[] = [];
  let applicationData: Record<string, unknown> = {
    id: appFixtureIds.data,
    applicationId: alpha,
    dataDescriptionId: appFixtureIds.description,
    dataDescription,
    exposures,
    documentationUrl: [],
    businessUsage: "Usage initial AT",
    example: "Valeur initiale AT",
    isReference: false,
    conservation: "Duree AT",
  };
  let attachedData = false;
  let rgaa: Record<string, unknown>[] = [
    {
      id: supplementIds.rgaa,
      applicationId: alpha,
      service_url: "https://service.example.invalid",
      accessibility_url: "https://service.example.invalid/accessibilite",
      score_percentage: 55,
      audit_date: "2026-10-01T00:00:00.000Z",
    },
  ];
  let compliance: Record<string, unknown> = {
    id: "compliance-synthetic-001",
    applicationId: alpha,
    eco_index_target_url: "https://example.invalid",
    eco_index_score: 65,
    eco_index_ges: 1,
    eco_index_water: 2,
    eco_index_last_calculated_at: "2026-10-01T00:00:00.000Z",
  };
  let saved: Record<string, unknown>[] = [
    {
      id: supplementIds.saved,
      name: "Filtre AT",
      filters: { search: "Alpha", iqMin: 30 },
    },
  ];
  let inlineReports: Record<string, unknown>[] = [];
  await page.context().route("**/api/v2/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      method = request.method();
    if (url.origin !== new URL(base.base).origin) return route.fallback();
    const path = url.pathname;
    const body: unknown = ["POST", "PATCH"].includes(method)
      ? request.postDataJSON()
      : undefined;
    let data: unknown;
    let status = 200;
    let key: ReplyKey | undefined;
    if (
      method === "GET" &&
      path.startsWith("/api/v2/users/by-email/") &&
      path.endsWith("/sync-organization-from-maia")
    ) {
      key = "maia";
      await pause(key);
      status = modes[key] === "error" ? 500 : 200;
      data =
        status === 200
          ? {
              organizationId: org.id,
              organizationPath: org.path,
              firstName: "Camille",
              lastName: "Maia AT",
            }
          : { message: "Recherche MAIA fictivement refusee" };
    } else if (method === "GET" && path === `/api/v2/organizations/${org.id}`)
      data = org;
    else if (
      kind === "wizard" &&
      method === "POST" &&
      path === "/api/v2/applications"
    ) {
      key = "wizard";
      started.push({ method, path, body });
      await pause(key);
      status = modes[key] === "error" ? 500 : 201;
      data =
        status === 201
          ? { id: alpha, ...bodyObject(body) }
          : { message: "Creation fictivement refusee" };
    } else if (
      kind === "wizard" &&
      method === "POST" &&
      path === `/api/v2/applications/${alpha}/actors`
    ) {
      key = "wizard-actor";
      started.push({ method, path, body });
      await pause(key);
      status = modes[key] === "error" ? 500 : 201;
      data =
        status === 201
          ? { id: `wizard-actor-${started.length}`, ...bodyObject(body) }
          : { message: "Contact fictivement refuse" };
    } else if (
      kind === "actor" &&
      method === "GET" &&
      path === `/api/v2/applications/${alpha}/actors`
    )
      data = { results: actors, total: actors.length };
    else if (
      kind === "actor" &&
      method === "POST" &&
      path === `/api/v2/applications/${alpha}/actors`
    ) {
      key = "actor";
      started.push({ method, path, body });
      await pause(key);
      const actor = { id: "actor-created-at", ...bodyObject(body) };
      actors = [...actors, actor];
      data = actor;
      status = 201;
    } else if (
      kind === "actor-bulk" &&
      method === "PATCH" &&
      path === "/api/v2/actors/by-email"
    ) {
      key = "bulk";
      started.push({ method, path, body });
      await pause(key);
      status = modes[key] === "error" ? 500 : 200;
      data =
        status === 200
          ? { count: 1 }
          : { message: "Modification groupee fictivement refusee" };
    } else if (
      kind === "technology" &&
      method === "GET" &&
      path === `/api/v2/applications/${alpha}/technologies`
    )
      data = technologies;
    else if (
      kind === "technology" &&
      method === "PATCH" &&
      path ===
        `/api/v2/applications/${alpha}/technologies/${supplementIds.technology}`
    ) {
      key = "technology";
      started.push({ method, path, body });
      await pause(key);
      technologies = technologies.map((item) => ({
        ...item,
        ...bodyObject(body),
      }));
      data = technologies[0];
    } else if (
      kind === "data" &&
      method === "GET" &&
      path === "/api/v2/data-catalog/descriptions"
    )
      data = [dataDescription];
    else if (
      kind === "data" &&
      method === "GET" &&
      path === "/api/v2/data-catalog/families"
    )
      data = { results: families, total: families.length };
    else if (
      kind === "data" &&
      method === "GET" &&
      path === `/api/v2/data-catalog/applications/${alpha}`
    )
      data = {
        results: attachedData ? [applicationData] : [],
        total: attachedData ? 1 : 0,
      };
    else if (
      kind === "data" &&
      method === "GET" &&
      path ===
        `/api/v2/data-catalog/applications/${alpha}/${appFixtureIds.data}`
    )
      data = applicationData;
    else if (
      kind === "data" &&
      method === "POST" &&
      path === "/api/v2/data-catalog/families"
    ) {
      key = "family";
      started.push({ method, path, body });
      await pause(key);
      const created = {
        id: "family-new-at",
        path: String(bodyObject(body).path),
      };
      families = [...families, created];
      data = created;
      status = 201;
    } else if (
      kind === "data" &&
      method === "PATCH" &&
      path === `/api/v2/data-catalog/descriptions/${appFixtureIds.description}`
    ) {
      key = "data";
      started.push({ method, path, body });
      const submitted = bodyObject(body);
      dataDescription = {
        ...dataDescription,
        ...submitted,
        families: Array.isArray(submitted.familyIds)
          ? families.filter((family) =>
              (submitted.familyIds as unknown[]).includes(family.id),
            )
          : dataDescription.families,
      };
      applicationData = { ...applicationData, dataDescription };
      data = dataDescription;
    } else if (
      kind === "data" &&
      ["POST", "PATCH"].includes(method) &&
      [
        `/api/v2/data-catalog/applications/${alpha}`,
        `/api/v2/data-catalog/applications/${alpha}/${appFixtureIds.data}`,
      ].includes(path)
    ) {
      key = "data";
      started.push({ method, path, body });
      await pause(key);
      applicationData = {
        ...applicationData,
        ...bodyObject(body),
        dataDescription,
      };
      attachedData = true;
      data = applicationData;
    } else if (
      kind === "data" &&
      method === "POST" &&
      path ===
        `/api/v2/data-catalog/applications/${alpha}/${appFixtureIds.data}/exposures`
    ) {
      key = "exposure";
      started.push({ method, path, body });
      await pause(key);
      const exposure = { id: supplementIds.exposure, ...bodyObject(body) };
      exposures = [...exposures, exposure];
      applicationData = { ...applicationData, exposures };
      data = exposure;
      status = 201;
    } else if (
      kind === "inline" &&
      method === "GET" &&
      path === `/api/v2/applications/${alpha}/reports`
    )
      data = { results: inlineReports, total: inlineReports.length };
    else if (
      kind === "inline" &&
      method === "POST" &&
      path === `/api/v2/applications/${alpha}/reports`
    ) {
      key = "inline";
      started.push({ method, path, body });
      await pause(key);
      status = modes[key] === "error" ? 500 : 201;
      const item = {
        id: "report-inline-at",
        ...bodyObject(body),
        status: "in_pending",
        notes: null,
        notifier: { id: "user-synthetic-001", email: "nvda@example.invalid" },
        impersonator: null,
        createdAt: "2026-10-13T10:00:00.000Z",
        updatedAt: "2026-10-13T10:00:00.000Z",
      };
      if (status === 201) inlineReports = [...inlineReports, item];
      data =
        status === 201 ? item : { message: "Signalement fictivement refuse" };
    } else if (
      kind === "compliances" &&
      method === "GET" &&
      path === `/api/v2/applications/${alpha}/compliances`
    )
      data = compliance;
    else if (
      kind === "compliances" &&
      method === "POST" &&
      path === `/api/v2/applications/${alpha}/compliances/ecoindex/scan`
    ) {
      key = "eco";
      started.push({ method, path });
      await pause(key);
      status = modes[key] === "error" ? 500 : 200;
      if (status === 200)
        compliance = {
          ...compliance,
          eco_index_score: 82,
          eco_index_water: 1.2,
          eco_index_ges: 0.55,
        };
      data =
        status === 200 ? compliance : { message: "Scan fictivement refuse" };
    } else if (
      kind === "compliances" &&
      method === "GET" &&
      path === `/api/v2/applications/${alpha}/rgaa-compliances`
    )
      data = rgaa;
    else if (
      kind === "compliances" &&
      method === "PATCH" &&
      path ===
        `/api/v2/applications/${alpha}/rgaa-compliances/${supplementIds.rgaa}`
    ) {
      key = "rgaa";
      started.push({ method, path, body });
      await pause(key);
      rgaa = [{ ...rgaa[0], ...bodyObject(body) }];
      data = rgaa[0];
    } else if (
      kind === "compliances" &&
      method === "DELETE" &&
      path ===
        `/api/v2/applications/${alpha}/rgaa-compliances/${supplementIds.rgaa}`
    ) {
      key = "rgaa-delete";
      started.push({ method, path });
      await pause(key);
      status = modes[key] === "error" ? 500 : 204;
      if (status === 204) rgaa = [];
      data = { message: "Suppression RGAA fictivement refusee" };
    } else if (
      kind === "filters" &&
      method === "GET" &&
      path === "/api/v2/saved-filters"
    )
      data = saved;
    else if (
      kind === "filters" &&
      method === "POST" &&
      path === "/api/v2/saved-filters"
    ) {
      key = "filter";
      started.push({ method, path, body });
      await pause(key);
      status = modes[key] === "error" ? 500 : 201;
      const item = { id: supplementIds.saved, ...bodyObject(body) };
      if (status === 201) saved = [item];
      data = status === 201 ? item : { message: "Filtre fictivement refuse" };
    } else if (
      kind === "filters" &&
      method === "DELETE" &&
      path === `/api/v2/saved-filters/${supplementIds.saved}`
    ) {
      key = "filter-delete";
      started.push({ method, path });
      await pause(key);
      status = modes[key] === "error" ? 500 : 204;
      if (status === 204) saved = [];
      data = { message: "Suppression filtre fictivement refusee" };
    } else if (
      kind === "info" &&
      method === "DELETE" &&
      (path.includes("/labels/") || path.includes("/hostings/"))
    ) {
      key = path.includes("/labels/") ? "label" : "hosting";
      started.push({ method, path });
      await pause(key);
      await route.fallback();
      return;
    } else return route.fallback();
    replies.push({
      method,
      path,
      status,
      ...(body === undefined ? {} : { body }),
    });
    if (status === 204) await route.fulfill({ status });
    else await route.fulfill({ status, json: data });
  });
  if (kind !== "actor-bulk") {
    await page.goto(
      kind === "info"
        ? `${base.base}/applications/${alpha}/tab-infos`
        : base.base,
    );
    if (kind === "wizard" || kind === "compliances")
      await mountRemainingScene(page, kind);
    else if (kind === "actor" || kind === "technology")
      await mountApplicationScene(page, "actors-technologies");
    else if (kind === "data") await mountApplicationScene(page, "data");
    else if (kind === "filters") await mountSharedScene(page, "search");
    else if (kind === "inline") {
      const vue = await page.evaluate(async () => {
        const main = await (await fetch("/src/main.ts")).text();
        const path = [...main.matchAll(/from\s+["']([^"']+)["']/g)]
          .map((match) => match[1])
          .find((path) => path.includes("/vue.js"));
        if (!path) throw new Error("Vue réel introuvable");
        return path;
      });
      const host = `import {defineComponent,h} from ${JSON.stringify(vue)};import ApplicationReportsTab from '/src/components/ApplicationReportsTab.vue';import AppToaster from '/src/components/AppToaster.vue';import {useToasterStore} from '/src/stores/toasterStore.ts';export default defineComponent({setup(){const toaster=useToasterStore(),application={id:${JSON.stringify(alpha)},label:'Application fictive Alpha',myPerms:new Set(['ReportRead','ReportPost'])};return()=>h('section',[h('h1','Signalements fiche — scène synthétique'),h(ApplicationReportsTab,{application}),h(AppToaster,{messages:toaster.messages,onCloseMessage:id=>toaster.removeMessage(id)})]);}});`;
      await page.route("**/src/at-inline-report-host.js", (route) =>
        route.fulfill({ contentType: "application/javascript", body: host }),
      );
      await mountProductionScene(page, "/src/at-inline-report-host.js");
    }
  }
  await page.evaluate((kind) => {
    document.title = `RefApp — complément ${kind} synthétique NVDA`;
  }, kind);
  return {
    ...base,
    kind,
    pageErrors,
    started,
    replies,
    borrowedCalls,
    modes,
    mode,
    hold: (key: ReplyKey) => held.add(key),
    pending,
    release,
    cancelPending: () => {
      for (const key of [...held]) release(key);
    },
    records: () => ({
      actors,
      technologies,
      applicationData,
      exposures,
      saved,
      rgaa,
      inlineReports,
    }),
  };
}

export async function observeSupplement(
  page: Page,
  info: TestInfo,
  name: string,
) {
  const observation = await page.evaluate(() => ({
    activeTag: document.activeElement?.tagName,
    activeId: document.activeElement?.id,
    activeTestId: document.activeElement?.getAttribute("data-testid"),
    text: document.body.innerText,
    dialogs: [...document.querySelectorAll("dialog[open]")].map((element) => ({
      title: element.getAttribute("aria-labelledby"),
      activeWithin: element.contains(document.activeElement),
      text: element.textContent,
    })),
    live: [
      ...document.querySelectorAll('output,[role="alert"],[role="status"]'),
    ].map((element) => ({
      role: element.getAttribute("role"),
      text: element.textContent,
    })),
  }));
  await info.attach(name, {
    body: JSON.stringify(observation),
    contentType: "application/json",
  });
  await page.screenshot({
    path: info.outputPath(`${name}.png`),
    fullPage: true,
  });
  return observation;
}
export async function finishSupplement(
  page: Page,
  network: Awaited<ReturnType<typeof prepareSupplement>>,
  info: TestInfo,
) {
  await info.attach(`supplement-network-${network.kind}`, {
    body: JSON.stringify({
      baseCalls: network.calls,
      borrowedCalls: network.borrowedCalls(),
      started: network.started,
      replies: network.replies,
      unhandled: network.unhandled,
      pageErrors: network.pageErrors,
      actualBusinessWrites: 0,
      realProviderRequests: 0,
    }),
    contentType: "application/json",
  });
  expect(network.unhandled).toEqual([]);
  expect(network.pageErrors).toEqual([]);
  await observeSupplement(page, info, `${network.kind}-final`);
}
