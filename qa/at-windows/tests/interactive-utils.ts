import { readFile } from "node:fs/promises";
import { expect, type Page, type TestInfo } from "@playwright/test";

export const alpha = "11111111-1111-4111-8111-111111111111";
export const beta = "22222222-2222-4222-8222-222222222222";
export const gamma = "33333333-3333-4333-8333-333333333333";
export const delta = "44444444-4444-4444-8444-444444444444";

const sampleApplication = {
  id: alpha,
  label: "Application fictive Alpha",
  shortName: "ALPHA-TEST",
  description: "Application synthétique de test NVDA.",
  purposes: [],
  targetPopulations: [],
  tags: [],
  labels: [],
  businessDivisions: [],
  currentStatus: null,
  quality: 60,
};

export function graphAtDepth(depth: number) {
  const nodes = [
    { id: alpha, label: "Application fictive Alpha", status: "in_production" },
    {
      id: beta,
      label: "Application fictive Bêta",
      status: "under_construction",
    },
    { id: gamma, label: "Application fictive Gamma", status: "in_production" },
  ];
  const edges = [
    {
      id: "relation-test-1",
      sourceId: alpha,
      sourceLabel: nodes[0].label,
      targetId: beta,
      targetLabel: nodes[1].label,
      type: "is_data_user_of",
    },
    {
      id: "relation-test-2",
      sourceId: beta,
      sourceLabel: nodes[1].label,
      targetId: gamma,
      targetLabel: nodes[2].label,
      type: "is_part_of",
    },
  ];
  if (depth > 1) {
    nodes.push({
      id: delta,
      label: "Application fictive Delta",
      status: "in_production",
    });
    edges.push({
      id: "relation-test-3",
      sourceId: alpha,
      sourceLabel: nodes[0].label,
      targetId: delta,
      targetLabel: nodes[3].label,
      type: "is_part_of",
    });
  }
  return { rootId: alpha, nodes, edges };
}

export const timeData = [
  {
    id: alpha,
    label: "Application fictive Alpha",
    shortName: "Alpha",
    technicalDebtInfo: {
      technicalMaturity: 4,
      businessMaturity: 4,
      costContainment: 3,
    },
  },
  {
    id: beta,
    label: "Application fictive Bêta",
    shortName: "Bêta",
    technicalDebtInfo: {
      technicalMaturity: 2,
      businessMaturity: 4,
      costContainment: null,
    },
  },
  {
    id: gamma,
    label: "Application fictive Gamma",
    shortName: null,
    technicalDebtInfo: null,
  },
];

export async function simulatedNetwork(page: Page) {
  const icons: unknown = JSON.parse(
    await readFile(
      new URL("../fixtures/ri-icons.json", import.meta.url),
      "utf8",
    ),
  );
  const state = {
    gristPermission: true,
    graphError: false,
    searchMode: "results" as "results" | "empty" | "error",
    linksMode: "error" as "error" | "success",
  };
  const calls: {
    method: string;
    pathname: string;
    query: string;
    status: number;
  }[] = [];
  const unhandled: { method: string; url: string }[] = [];
  const base = process.env.RGAA_APP_URL ?? "http://127.0.0.1:5173";
  const origin = new URL(base).origin;
  const config = {
    oidcConfigUrl: `${origin}/at-oidc/.well-known/openid-configuration`,
    oidcClientId: "at-synthetic-client",
    oidcScope: "openid profile email",
    version: "test-synthetic",
    environmentLabel: "Test synthétique NVDA",
    footerLinks: [],
  };
  await page.context().route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      method = request.method();
    if (
      method === "GET" &&
      [
        "https://api.iconify.design",
        "https://api.unisvg.com",
        "https://api.simplesvg.com",
      ].includes(url.origin) &&
      url.pathname === "/ri.json"
    ) {
      await route.fulfill({
        status: 200,
        json: icons,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
      return;
    }
    if (url.origin !== origin) {
      unhandled.push({ method, url: url.origin + url.pathname });
      await route.abort("blockedbyclient");
      return;
    }
    if (!url.pathname.startsWith("/api/v2/")) {
      await route.continue();
      return;
    }
    let data: unknown,
      status = 200;
    if (method === "GET" && url.pathname === "/api/v2/config") data = config;
    else if (method === "GET" && url.pathname === "/api/v2/health-check")
      data = { status: "ok" };
    else if (method === "GET" && url.pathname === "/api/v2/users/me")
      data = {
        id: "user-synthetic-001",
        email: "nvda@example.invalid",
        role: "ADMIN",
        permissions: [
          "LinkWrite",
          "RelationWrite",
          ...(state.gristPermission ? ["GristSync"] : []),
        ],
        additionalPermissions: [],
        followedApplications: [],
        emailNotificationsEnabled: false,
        gristUrl: "https://grist.example.invalid",
        hasGristApiKey: false,
        gristDocIds: [],
      };
    else if (method === "GET" && url.pathname === "/api/v2/tokens/personal")
      data = [];
    else if (method === "GET" && url.pathname.endsWith("/count-by-iq"))
      data = [
        { iq: 20, total: 2 },
        { iq: 70, total: 3 },
        { iq: 100, total: 1 },
      ];
    else if (method === "GET" && url.pathname.endsWith("/count-by-month"))
      data = [
        { month: "2026-05", total: 2 },
        { month: "2026-06", total: 4 },
        { month: "2026-07", total: 6 },
      ];
    else if (method === "GET" && url.pathname.endsWith("/iq-avg/period"))
      data = [
        { label: "2026-05", moyenne: 42, min: 20, max: 60, count: 2 },
        { label: "2026-06", moyenne: 64, min: 50, max: 80, count: 4 },
      ];
    else if (method === "GET" && url.pathname.endsWith("/relations/graph")) {
      if (state.graphError) {
        status = 500;
        data = { message: "Défaillance de graphe simulée" };
      } else data = graphAtDepth(Number(url.searchParams.get("depth") ?? "1"));
    } else if (method === "GET" && url.pathname.endsWith("/relations"))
      data = [];
    else if (method === "GET" && url.pathname === "/api/v2/applications") {
      if (state.searchMode === "error") {
        status = 500;
        data = { message: "Défaillance de recherche simulée" };
      } else {
        const results =
          state.searchMode === "empty"
            ? []
            : [
                { id: beta, label: "Application fictive Bêta" },
                { id: gamma, label: "Application fictive Gamma" },
              ];
        data = {
          results,
          total: results.length,
          technicalDebtPoints: [],
          averageIq: 60,
        };
      }
    } else if (method === "GET" && url.pathname === "/api/v2/organizations") {
      if (state.searchMode === "error") {
        status = 500;
        data = { message: "Défaillance d’organisation simulée" };
      } else
        data = {
          results:
            state.searchMode === "empty"
              ? []
              : [
                  {
                    id: "org-synthetic-001",
                    label: "Organisation synthétique",
                    path: "Test/Organisation synthétique",
                    parentId: null,
                  },
                ],
          total: state.searchMode === "empty" ? 0 : 1,
        };
    } else if (method === "GET" && url.pathname.endsWith("/links"))
      data = { results: [], total: 0 };
    else if (
      method === "POST" &&
      url.pathname === `/api/v2/applications/${alpha}/links`
    ) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (state.linksMode === "error") {
        status = 500;
        data = { message: "Défaillance de lien simulée" };
      } else
        data = {
          id: "link-synthetic-001",
          type: "website",
          link: "https://example.invalid",
          description: "Lien synthétique",
        };
    } else {
      unhandled.push({ method, url: url.pathname + url.search });
      await route.abort("blockedbyclient");
      return;
    }
    calls.push({ method, pathname: url.pathname, query: url.search, status });
    await route.fulfill({ status, json: data });
  });
  return { state, calls, unhandled, base };
}

interface BrowserApplication {
  config: { idPrefix: string };
  use(plugin: unknown, options?: unknown): BrowserApplication;
  component(name: string, component: unknown): BrowserApplication;
  mount(element: HTMLElement): unknown;
  unmount(): void;
}
interface BrowserUserStore {
  authenticated: boolean;
  sessionInitialized: boolean;
  fetchUser(): Promise<void>;
}
declare global {
  interface Window {
    __rgaaAtHost?: { app: BrowserApplication; refreshUser(): Promise<void> };
    __rgaaSceneSequence?: number;
  }
}

export async function mountProductionScene(
  page: Page,
  componentPath: string,
  props: Record<string, unknown> = {},
) {
  await page.evaluate(
    async ({ componentPath, props, sampleApplication }) => {
      const readModule = async (path: string) => {
        const response = await fetch(path);
        if (!response.ok)
          throw new Error(
            `Module produit indisponible : ${path} (HTTP ${response.status})`,
          );
        return response.text();
      };
      const main = await readModule("/src/main.ts");
      const routerSource = await readModule("/src/router/index.ts");
      const specifiers = [
        ...`${main}\n${routerSource}`.matchAll(/from\s+["']([^"']+)["']/g),
      ].map((match) => match[1]);
      const dependency = (fragment: string) => {
        const source = specifiers.find((value) => value.includes(fragment));
        if (!source)
          throw new Error(`Dépendance du vrai client absente : ${fragment}`);
        return source;
      };
      const vue = (await import(dependency("/vue.js"))) as {
        createApp(
          component: unknown,
          props: Record<string, unknown>,
        ): BrowserApplication;
      };
      const pinia = (await import(dependency("/pinia.js"))) as {
        createPinia(): unknown;
      };
      const routing = (await import(dependency("/vue-router.js"))) as {
        createRouter(options: unknown): unknown;
        createMemoryHistory(): unknown;
      };
      const dsfr = (await import(dependency("vue-dsfr"))) as Record<
        string,
        unknown
      >;
      const prime = (await import(dependency("primevue_config.js"))) as {
        default: unknown;
      };
      const aura = (await import(dependency("@primevue_themes_aura.js"))) as {
        default: unknown;
      };
      const localePath = "/src/constants/primevue-locale.ts";
      const locale = (await import(localePath)) as {
        primeVueFrenchLocale: unknown;
      };
      const component = (await import(componentPath)) as { default: unknown };
      const userStorePath = "/src/stores/userStore.ts";
      const stores = (await import(userStorePath)) as {
        useUserStore(pinia: unknown): BrowserUserStore;
      };
      const root = document.getElementById("app") as
        | (HTMLElement & { __vue_app__?: BrowserApplication })
        | null;
      root?.__vue_app__?.unmount();
      window.__rgaaAtHost?.app.unmount();
      document.getElementById("at-live-scene")?.remove();
      const container = document.createElement("main");
      container.id = "at-live-scene";
      document.body.append(container);
      document.title = "RefApp — scène interactive synthétique NVDA";
      const localProps = { ...props };
      if (localProps.application === true)
        localProps.application = {
          ...sampleApplication,
          myPerms: new Set(["LinkWrite", "RelationWrite", "RelationRead"]),
        };
      const app = vue.createApp(component.default, localProps),
        storeRoot = pinia.createPinia();
      window.__rgaaSceneSequence = (window.__rgaaSceneSequence ?? 0) + 1;
      app.config.idPrefix = `at-scene-${window.__rgaaSceneSequence}`;
      app.use(storeRoot);
      app.use(
        routing.createRouter({
          history: routing.createMemoryHistory(),
          routes: [
            { path: "/", component: { template: "<div></div>" } },
            {
              path: "/applications/:id",
              name: "application",
              component: { template: "<div></div>" },
            },
          ],
        }),
      );
      app.use(prime.default, {
        locale: locale.primeVueFrenchLocale,
        theme: {
          preset: aura.default,
          options: { darkModeSelector: '[data-fr-theme="dark"]' },
        },
      });
      if (dsfr.VIcon) app.component("VIcon", dsfr.VIcon);
      const user = stores.useUserStore(storeRoot);
      await new Promise<void>((resolve) => {
        const check = () => {
          if (user.sessionInitialized) resolve();
          else setTimeout(check, 10);
        };
        check();
      });
      user.authenticated = true;
      await user.fetchUser();
      app.mount(container);
      window.__rgaaAtHost = { app, refreshUser: () => user.fetchUser() };
    },
    { componentPath, props, sampleApplication },
  );
}

export async function finishInteractive(
  page: Page,
  network: Awaited<ReturnType<typeof simulatedNetwork>>,
  info: TestInfo,
) {
  await info.attach("simulated-network", {
    body: Buffer.from(
      JSON.stringify(
        {
          calls: network.calls,
          unhandled: network.unhandled,
          actualBusinessWrites: 0,
        },
        null,
        2,
      ),
    ),
    contentType: "application/json",
  });
  expect(network.unhandled).toEqual([]);
  await page.screenshot({
    path: info.outputPath("interactive-final.png"),
    fullPage: true,
  });
}
