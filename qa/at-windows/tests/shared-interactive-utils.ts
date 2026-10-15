import { expect, type Page, type TestInfo } from "@playwright/test";
import { mountProductionScene, simulatedNetwork } from "./interactive-utils.js";

const applications = Array.from({ length: 45 }, (_, index) => ({
  id: `55555555-5555-4555-8555-${String(index + 1).padStart(12, "0")}`,
  label: `Application ${index < 3 ? "Alpha" : "Bêta"} ${String(index + 1).padStart(2, "0")}`,
  shortName: `AT-${index + 1}`,
  description: "Application synthétique du contrôle natif.",
  purposes: [],
  targetPopulations: [],
  hostings: [],
  actors: [],
  tags: [],
  labels: [],
  businessDivisions: [],
  priorityRestart: "R2",
  quality: index < 3 ? (index + 1) * 20 : 60,
  currentStatus: {
    id: `status-${index}`,
    status: "in_production",
    statusDate: "2026-01-01T00:00:00.000Z",
  },
  compliance: null,
  technicalDebtInfo: null,
  rgaaScorePercentage: null,
}));

export async function sharedNetwork(page: Page) {
  const network = await simulatedNetwork(page);
  const extraCalls: {
    method: string;
    pathname: string;
    query: string;
    status: number;
  }[] = [];
  const state = { applicationsMode: "ok" as "ok" | "empty" | "error" };
  const origin = new URL(network.base).origin;
  await page.context().route("**/api/v2/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      method = request.method();
    if (url.origin !== origin) {
      await route.fallback();
      return;
    }
    if (method !== "GET") {
      network.unhandled.push({ method, url: url.pathname });
      await route.abort("blockedbyclient");
      return;
    }
    let data: unknown;
    let status = 200;
    switch (url.pathname) {
      case "/api/v2/applications": {
        if (state.applicationsMode === "error") {
          status = 500;
          data = { message: "Erreur de recherche synthétique" };
          break;
        }
        const search = (url.searchParams.get("search") ?? "").toLocaleLowerCase(
          "fr",
        );
        const minimum = Number(url.searchParams.get("iqGte") ?? 0);
        const maximum = Number(url.searchParams.get("iqLte") ?? 100);
        const candidates =
          state.applicationsMode === "empty"
            ? []
            : applications.filter(
                (a) =>
                  a.label.toLocaleLowerCase("fr").includes(search) &&
                  a.quality >= minimum &&
                  a.quality <= maximum,
              );
        candidates.sort((a, b) =>
          url.searchParams.get("sortBy") === "quality"
            ? a.quality - b.quality
            : a.label.localeCompare(b.label, "fr"),
        );
        if (url.searchParams.get("order") === "desc") candidates.reverse();
        const size = Number(url.searchParams.get("pageSize") ?? 15),
          pageNumber = Number(url.searchParams.get("page") ?? 0);
        data = {
          results:
            size > 0
              ? candidates.slice(pageNumber * size, (pageNumber + 1) * size)
              : candidates,
          total: candidates.length,
          technicalDebtPoints: [],
          averageIq: candidates.length
            ? candidates.reduce((n, a) => n + a.quality, 0) / candidates.length
            : 0,
        };
        break;
      }
      case "/api/v2/hosting-options":
        data = { results: [], total: 0 };
        break;
      case "/api/v2/actorTypes":
        data = { results: [], total: 0 };
        break;
      case "/api/v2/business-division":
        data = { results: [], total: 0 };
        break;
      case "/api/v2/tags":
        data = { results: [], total: 0 };
        break;
      case "/api/v2/mdit-campaigns":
        data = { results: [], total: 0 };
        break;
      case "/api/v2/data-catalog/families":
      case "/api/v2/data-catalog/descriptions":
      case "/api/v2/data-catalog/sensibilities":
        data = [];
        break;
      case "/api/v2/notifications/unread-count":
        data = { count: 0 };
        break;
      case "/api/v2/notifications":
        data = {
          results: [
            {
              id: "notification-selection-at",
              userId: "user-synthetic-001",
              message: "Notification synthétique pour sélectionner une ligne",
              createdAt: "2026-10-01T10:00:00.000Z",
              isRead: true,
              link: null,
              emailLogId: null,
              type: "APPLICATION_UPDATED",
            },
          ],
          total: 1,
        };
        break;
      case "/api/v2/saved-filters":
        data = [
          {
            id: "saved-at-001",
            name: "Filtre Alpha",
            filters: { search: "Alpha" },
            createdAt: "2026-10-01T10:00:00.000Z",
            userId: "user-synthetic-001",
          },
        ];
        break;
      default:
        await route.fallback();
        return;
    }
    extraCalls.push({
      method,
      pathname: url.pathname,
      query: url.search,
      status,
    });
    await route.fulfill({ status, json: data });
  });
  return {
    ...network,
    state: { ...network.state, ...state },
    extraState: state,
    extraCalls,
  };
}

declare global {
  interface Window {
    __rgaaShared?: {
      ready: boolean;
      path(): string;
      setAuthenticated(value: boolean): void;
      navigate(path: string): Promise<unknown>;
    };
  }
}

/** Only the scene host is generated: App, views, route records, stores and handlers stay real. */
export async function mountSharedScene(
  page: Page,
  kind: "navigation" | "search" | "notifications",
) {
  if (kind === "navigation") {
    // Keep the App already mounted by main.ts: no second useScheme lifetime.
    await expect(
      page.getByRole("button", { name: /Paramètres d'affichage/ }),
    ).toBeVisible();
    await page.evaluate(async () => {
      interface OriginalRouter {
        currentRoute: { value: { path: string } };
        isReady(): Promise<void>;
        replace(path: string): Promise<unknown>;
        push(path: string): Promise<unknown>;
      }
      interface OriginalUserStore {
        authenticated: boolean;
        sessionInitialized: boolean;
        fetchUser(): Promise<void>;
      }
      const root = document.getElementById("app") as
        | (HTMLElement & {
            __vue_app__?: {
              config: {
                globalProperties: {
                  $router?: OriginalRouter;
                  $pinia?: unknown;
                };
              };
            };
          })
        | null;
      const application = root?.__vue_app__;
      const router = application?.config.globalProperties.$router;
      const storeRoot = application?.config.globalProperties.$pinia;
      if (!application || !router || !storeRoot) {
        throw new Error(
          "App originale, routeur et Pinia réels requis pour U01.",
        );
      }
      const storeModulePath = "/src/stores/userStore.ts";
      const stores = (await import(storeModulePath)) as {
        useUserStore(pinia: unknown): OriginalUserStore;
      };
      const user = stores.useUserStore(storeRoot);
      const deadline = Date.now() + 10_000;
      while (!user.sessionInitialized) {
        if (Date.now() >= deadline) {
          throw new Error("Initialisation du store utilisateur non terminée.");
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 10));
      }
      // Same synthetic GET as the scene mounter, through the original handler.
      await user.fetchUser();
      user.authenticated = false;
      const host = {
        ready: false,
        path: () => router.currentRoute.value.path,
        setAuthenticated: (value: boolean) => {
          user.authenticated = value;
        },
        navigate: (path: string) => router.push(path),
      };
      window.__rgaaShared = host;
      await router.isReady();
      await router.replace("/plan-du-site");
      host.ready = true;
    });
    await expect
      .poll(() => page.evaluate(() => window.__rgaaShared?.ready))
      .toBe(true);
    return;
  }
  const source = await page.locator("body").evaluate(async () => {
    const main = await (await fetch("/src/main.ts")).text();
    const router = await (await fetch("/src/router/index.ts")).text();
    const imports = [
      ...`${main}\n${router}`.matchAll(/from\s+["']([^"']+)["']/g),
    ].map((m) => m[1]);
    const dependency = (fragment: string) => {
      const value = imports.find((s) => s.includes(fragment));
      if (!value) throw new Error(`Import réel absent : ${fragment}`);
      return value;
    };
    return {
      vue: dependency("/vue.js"),
      router: dependency("/vue-router.js"),
      prime: dependency("primevue_config.js"),
    };
  });
  const module = `
import {defineComponent,h} from ${JSON.stringify(source.vue)};
import {useRouter} from ${JSON.stringify(source.router)};
import {usePrimeVue} from ${JSON.stringify(source.prime)};
import {primeVueFrenchLocale} from "/src/constants/primevue-locale.ts";
import App from "/src/App.vue";
import originalRouter from "/src/router/index.ts";
import {useUserStore} from "/src/stores/userStore.ts";
export default defineComponent({props:{kind:String},setup(props){
 const router=useRouter(),user=useUserStore(),prime=usePrimeVue();
 prime.config.locale={...prime.config.locale,...primeVueFrenchLocale,aria:{...prime.config.locale.aria,...primeVueFrenchLocale.aria}};
 for(const record of originalRouter.getRoutes()){
  if(record.name && record.components?.default)router.addRoute({name:record.name,path:record.path,component:record.components.default,meta:record.meta,props:record.props?.default,beforeEnter:record.beforeEnter});
  else if(record.name)router.addRoute({name:record.name,path:record.path,beforeEnter:record.beforeEnter,meta:record.meta});
 }
 if(props.kind==="navigation")user.authenticated=false;
 const host={ready:false,path:()=>router.currentRoute.value.path,setAuthenticated:(value)=>{user.authenticated=value},navigate:(path)=>router.push(path)};
 window.__rgaaShared=host;
 const initial=props.kind==="navigation"?"/plan-du-site":props.kind==="notifications"?"/notifications":"/recherche-application";
 void router.replace(initial).then(()=>{host.ready=true});
 return ()=>h(App);
}});
`;
  await page.route("**/src/at-shared-host.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: module }),
  );
  await mountProductionScene(page, "/src/at-shared-host.js", { kind });
  await expect
    .poll(() => page.evaluate(() => window.__rgaaShared?.ready))
    .toBe(true);
}

export async function finishShared(
  page: Page,
  network: Awaited<ReturnType<typeof sharedNetwork>>,
  info: TestInfo,
) {
  const calls = [...network.calls, ...network.extraCalls];
  await info.attach("shared-strict-synthetic-network", {
    body: Buffer.from(
      JSON.stringify(
        { calls, unhandled: network.unhandled, actualBusinessWrites: 0 },
        null,
        2,
      ),
    ),
    contentType: "application/json",
  });
  expect(network.unhandled).toEqual([]);
  expect(calls.filter((c) => c.method !== "GET")).toHaveLength(0);
  await page.screenshot({
    path: info.outputPath("shared-scene-final.png"),
    fullPage: true,
  });
}
