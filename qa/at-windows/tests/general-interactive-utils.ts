import { expect, type Page, type TestInfo } from "@playwright/test";
import { alpha } from "./interactive-utils.js";
import { operationsNetwork } from "./operations-interactive-utils.js";

export const generalIds = {
  label: "88888888-8888-4888-8888-888888888881",
  source: "88888888-8888-4888-8888-888888888882",
  hosting: "88888888-8888-4888-8888-888888888883",
  option: "88888888-8888-4888-8888-888888888884",
  status: "88888888-8888-4888-8888-888888888885",
  debt: "88888888-8888-4888-8888-888888888886",
  labelNew: "88888888-8888-4888-8888-888888888891",
  hostingNew: "88888888-8888-4888-8888-888888888893",
  statusNew: "88888888-8888-4888-8888-888888888895",
};
const source = { id: generalIds.source, source: "Source fictive AT" };
const option = {
  id: generalIds.option,
  provider: "Fournisseur AT",
  platform: "Plateforme AT",
  site: "Site AT",
  building: null,
  room: null,
};
export const optionText = "Fournisseur AT - Plateforme AT - Site AT";
const permissions = [
  "AppRead",
  "AppWrite",
  "AppWritePriority",
  "HostingRead",
  "HostingWrite",
  "MetadataRead",
  "ActorRead",
  "TechnologyRead",
  "DataRead",
  "ComplianceRead",
  "RelationRead",
  "LinkRead",
];

export async function generalNetwork(page: Page) {
  const base = await operationsNetwork(page);
  const state = {
    app: "error" as "error" | "success",
    label: "error" as "error" | "success",
    hosting: "error" as "error" | "success",
    status: "error" as "error" | "success",
    debt: "error" as "error" | "success",
    sources: "success" as "error" | "success",
    options: "success" as "error" | "success",
    campaignDelayMs: 100,
    holdCampaigns: false,
    mutationDelayMs: 900,
  };
  let releaseCampaigns: (() => void) | undefined;
  let campaignPending = false;
  page.on("close", () => releaseCampaigns?.());
  let app = {
    id: alpha,
    label: "Application fictive Alpha",
    shortName: "ALPHA-TEST",
    description: "Description entièrement fictive U08",
    logo: null,
    type: "business",
    purposes: [],
    targetPopulations: [],
    tags: [],
    businessDivisions: [],
    priorityRestart: "R2",
    quality: null,
    currentStatus: {
      id: generalIds.status,
      status: "in_production",
      version: "Initiale AT",
      statusDate: "2026-01-01T00:00:00.000Z",
    },
  };
  let labels = [
    {
      id: generalIds.label,
      applicationId: alpha,
      value: "Nom alternatif fictif",
      labelSourceId: generalIds.source,
      labelSource: source,
    },
  ];
  let hostings = [
    {
      id: generalIds.hosting,
      applicationId: alpha,
      label: "Hébergement fictif",
      hostingOptionId: generalIds.option,
      isActive: true as boolean | null,
      hostingOption: option,
    },
  ];
  let statuses = [
    {
      id: generalIds.status,
      applicationId: alpha,
      status: "in_production",
      version: "Initiale AT",
      statusDate: "2026-01-01T00:00:00.000Z",
    },
  ];
  let debt = {
    id: generalIds.debt,
    applicationId: alpha,
    millesime: 2026,
    technicalMaturity: 3,
    businessMaturity: 4,
    costContainment: 2,
  };
  const calls: {
    method: string;
    pathname: string;
    query: string;
    status: number;
    body?: unknown;
  }[] = [];
  const origin = new URL(base.base).origin;
  const unavailableDecorativeIcons: string[] = [];
  // These pre-existing shorthand names have no Iconify collection. Return a
  // local404 for the exact invalid decorative URLs; never allow an external read.
  await page
    .context()
    .route(
      /^https:\/\/(?:api\.iconify\.design|api\.unisvg\.com|api\.simplesvg\.com)\/(?:add|delete)\.json(?:\?.*)?$/,
      async (route) => {
        unavailableDecorativeIcons.push(
          new URL(route.request().url()).pathname,
        );
        await route.fulfill({ status: 404, json: { not_found: ["line"] } });
      },
    );
  await page.context().route("**/api/v2/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      method = request.method();
    if (url.origin !== origin) {
      await route.fallback();
      return;
    }
    let data: unknown,
      status = 200;
    const body = ["POST", "PATCH"].includes(method)
      ? (request.postDataJSON() as Record<string, unknown>)
      : undefined;
    const root = `/api/v2/applications/${alpha}`;
    const failure = () => {
      status = 500;
      return { message: "Enregistrement fictif refusé" };
    };
    if (method === "GET" && url.pathname === root) data = app;
    else if (method === "GET" && url.pathname === `${root}/my-perms`)
      data = permissions;
    else if (method === "GET" && url.pathname === `${root}/labels`)
      data = labels;
    else if (method === "GET" && url.pathname === `${root}/hostings`)
      data = hostings;
    else if (method === "GET" && url.pathname === `${root}/statuses`)
      data = statuses;
    else if (method === "GET" && url.pathname === `${root}/technical-debt-info`)
      data = { results: [debt], total: 1 };
    else if (method === "GET" && url.pathname === "/api/v2/label-sources")
      data =
        state.sources === "error" ? failure() : { results: [source], total: 1 };
    else if (method === "GET" && url.pathname === "/api/v2/hosting-options")
      data =
        state.options === "error" ? failure() : { results: [option], total: 1 };
    else if (method === "GET" && url.pathname === "/api/v2/mdit-campaigns") {
      campaignPending = true;
      if (state.holdCampaigns)
        await new Promise<void>((resolve) => (releaseCampaigns = resolve));
      await new Promise((resolve) =>
        setTimeout(resolve, state.campaignDelayMs),
      );
      campaignPending = false;
      data = {
        results: [
          {
            id: "campaign-synthetic-u08",
            year: 2026,
            name: "Campagne fictive 2026",
            isActive: true,
          },
        ],
        total: 1,
      };
    } else if (method === "PATCH" && url.pathname === root) {
      await new Promise((resolve) =>
        setTimeout(resolve, state.mutationDelayMs),
      );
      if (state.app === "error") data = failure();
      else {
        app = { ...app, ...body };
        data = app;
      }
    } else if (
      ["POST", "PATCH", "DELETE"].includes(method) &&
      (url.pathname === `${root}/labels` ||
        url.pathname.startsWith(`${root}/labels/`))
    ) {
      await new Promise((resolve) =>
        setTimeout(resolve, state.mutationDelayMs),
      );
      if (state.label === "error") data = failure();
      else if (method === "DELETE") {
        labels = labels.filter((item) => !url.pathname.endsWith(`/${item.id}`));
        status = 204;
      } else {
        const item = {
          ...labels[0],
          ...body,
          id: method === "POST" ? generalIds.labelNew : generalIds.label,
        };
        if (method === "POST") labels.push(item);
        else labels[0] = item;
        data = item;
      }
    } else if (
      ["POST", "PATCH", "DELETE"].includes(method) &&
      (url.pathname === `${root}/hostings` ||
        url.pathname.startsWith(`${root}/hostings/`))
    ) {
      await new Promise((resolve) =>
        setTimeout(resolve, state.mutationDelayMs),
      );
      if (state.hosting === "error") data = failure();
      else if (method === "DELETE") {
        hostings = hostings.filter(
          (item) => !url.pathname.endsWith(`/${item.id}`),
        );
        status = 204;
      } else {
        const item = {
          ...hostings[0],
          ...body,
          id: method === "POST" ? generalIds.hostingNew : generalIds.hosting,
        };
        if (method === "POST") hostings.push(item);
        else hostings[0] = item;
        data = item;
      }
    } else if (
      ["POST", "PATCH", "DELETE"].includes(method) &&
      (url.pathname === `${root}/statuses` ||
        url.pathname.startsWith(`${root}/statuses/`))
    ) {
      await new Promise((resolve) =>
        setTimeout(resolve, state.mutationDelayMs),
      );
      if (state.status === "error") data = failure();
      else if (method === "DELETE") {
        statuses = statuses.filter(
          (item) => !url.pathname.endsWith(`/${item.id}`),
        );
        status = 204;
      } else {
        const item = {
          ...statuses[0],
          ...body,
          id: method === "POST" ? generalIds.statusNew : generalIds.status,
        };
        if (method === "POST") statuses.push(item);
        else statuses[0] = item;
        data = item;
      }
    } else if (
      method === "POST" &&
      url.pathname === `${root}/technical-debt-info`
    ) {
      await new Promise((resolve) =>
        setTimeout(resolve, state.mutationDelayMs),
      );
      if (state.debt === "error") data = failure();
      else {
        debt = { ...debt, ...body };
        data = debt;
      }
    } else {
      await route.fallback();
      return;
    }
    calls.push({
      method,
      pathname: url.pathname,
      query: url.search,
      status,
      body,
    });
    if (status === 204) await route.fulfill({ status });
    else await route.fulfill({ status, json: data });
  });
  return {
    ...base,
    generalState: state,
    generalCalls: calls,
    unavailableDecorativeIcons,
    campaignPending: () => campaignPending,
    releaseCampaigns: () => releaseCampaigns?.(),
  };
}

export async function observeGeneral(page: Page, info: TestInfo, name: string) {
  const observed = await page.evaluate(() => ({
    activeTag: document.activeElement?.tagName,
    activeId: document.activeElement?.id,
    activeTestId: document.activeElement?.getAttribute("data-testid"),
    dialog: Array.from(
      document.querySelectorAll('dialog[open],[role="dialog"]'),
    )
      .filter(
        (element) => (element as HTMLElement).getBoundingClientRect().width > 0,
      )
      .map((element) => ({
        label: element.getAttribute("aria-label"),
        labelledby: element.getAttribute("aria-labelledby"),
        focusWithin: element.contains(document.activeElement),
        alerts: Array.from(
          element.querySelectorAll('[role="alert"]'),
          (alert) => alert.textContent?.trim(),
        ),
      })),
    liveRegions: Array.from(
      document.querySelectorAll('[role="alert"],[role="status"],[aria-live]'),
      (element) => ({
        role: element.getAttribute("role"),
        live: element.getAttribute("aria-live"),
        text: element.textContent?.trim(),
      }),
    ),
  }));
  await info.attach(name, {
    body: Buffer.from(JSON.stringify(observed)),
    contentType: "application/json",
  });
  await page.screenshot({
    path: info.outputPath(`${name}.png`),
    fullPage: true,
  });
  return observed;
}

export async function finishGeneral(
  page: Page,
  network: Awaited<ReturnType<typeof generalNetwork>>,
  info: TestInfo,
) {
  await info.attach("general-network-simulated-only", {
    body: Buffer.from(
      JSON.stringify({
        calls: [
          ...network.calls,
          ...network.extraCalls,
          ...network.operationsCalls,
          ...network.generalCalls,
        ],
        unhandled: network.unhandled,
        unavailableDecorativeIcons: network.unavailableDecorativeIcons,
        actualBusinessWrites: 0,
        realProviderRequests: 0,
      }),
    ),
    contentType: "application/json",
  });
  expect(network.unhandled).toEqual([]);
  await page.screenshot({
    path: info.outputPath("general-scene-final.png"),
    fullPage: true,
  });
}
