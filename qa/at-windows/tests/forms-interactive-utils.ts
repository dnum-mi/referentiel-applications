import { expect, type Page, type TestInfo } from "@playwright/test";
import { simulatedNetwork, mountProductionScene } from "./interactive-utils.js";

export const notificationIds = {
  linked: "55555555-5555-4555-8555-555555555555",
  email: "66666666-6666-4666-8666-666666666666",
};
const notices = [
  {
    id: notificationIds.linked,
    type: "report_added",
    message: "Signalement fictif pour Alpha",
    link: "/applications/11111111-1111-4111-8111-111111111111",
    emailLogId: null,
    isRead: false,
    createdAt: "2026-10-13T08:00:00Z",
  },
  {
    id: notificationIds.email,
    type: "report_added",
    message: "Courriel fictif de test",
    link: null,
    emailLogId: "email-synthetic-001",
    isRead: false,
    createdAt: "2026-10-13T08:30:00Z",
  },
];

export async function simulatedFormsNetwork(page: Page) {
  const base = await simulatedNetwork(page);
  const state = {
    reportMode: "error" as "error" | "success",
    notificationMode: "results" as "results" | "empty",
    markMode: "success" as "error" | "success",
    notifications: notices.map((item) => ({ ...item })),
  };
  const calls: { method: string; pathname: string; status: number }[] = [];
  await page.context().route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      method = req.method();
    if (url.origin !== new URL(base.base).origin) {
      await route.fallback();
      return;
    }
    let data: unknown,
      status = 200;
    if (method === "POST" && url.pathname === "/api/v2/reports") {
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (state.reportMode === "error") {
        status = 500;
        data = { message: "Défaillance de signalement entièrement simulée" };
      } else {
        status = 201;
        data = {
          id: "report-synthetic-001",
          description: "Signalement fictif de test NVDA",
          status: "in_pending",
          createdAt: "2026-10-13T09:00:00Z",
        };
      }
    } else if (
      method === "GET" &&
      url.pathname === "/api/v2/notifications/unread-count"
    )
      data = {
        count:
          state.notificationMode === "empty"
            ? 0
            : state.notifications.filter((item) => !item.isRead).length,
      };
    else if (method === "GET" && url.pathname === "/api/v2/notifications")
      data = {
        results: state.notificationMode === "empty" ? [] : state.notifications,
        total:
          state.notificationMode === "empty" ? 0 : state.notifications.length,
      };
    else if (
      method === "PATCH" &&
      url.pathname === `/api/v2/notifications/${notificationIds.email}/read`
    ) {
      if (state.markMode === "error") {
        status = 500;
        data = { message: "Défaillance de marquage simulée" };
      } else {
        const notice = state.notifications.find(
          (item) => item.id === notificationIds.email,
        );
        if (notice) notice.isRead = true;
        data = { message: "Notification fictive lue" };
      }
    } else if (
      method === "GET" &&
      url.pathname === `/api/v2/notifications/${notificationIds.email}/email`
    )
      data = {
        id: "email-synthetic-001",
        to: "destinataire@example.invalid",
        subject: "Courriel synthétique pour NVDA",
        sentAt: "2026-10-13T08:30:00Z",
        wasSent: false,
        html: "<!doctype html><html lang='fr'><head><title>Courriel synthétique</title></head><body><h1>Courriel synthétique</h1><p>Cette notification et ce courrier sont entièrement fictifs.</p></body></html>",
      };
    else {
      await route.fallback();
      return;
    }
    calls.push({ method, pathname: url.pathname, status });
    await route.fulfill({ status, json: data });
  });
  return { ...base, formsState: state, formsCalls: calls };
}

interface BrowserApp {
  use(plugin: unknown, options?: unknown): BrowserApp;
  component(name: string, component: unknown): BrowserApp;
  directive(name: string, directive: unknown): BrowserApp;
  mount(element: HTMLElement): unknown;
  unmount(): void;
}
interface BrowserRef<T> {
  value: T;
}
interface BrowserVue {
  createApp(component: unknown): BrowserApp;
  h(
    component: unknown,
    props?: Record<string, unknown> | null,
    children?: unknown,
  ): unknown;
  ref<T>(value: T): BrowserRef<T>;
}
interface BrowserUser {
  authenticated: boolean;
  sessionInitialized: boolean;
  fetchUser(): Promise<void>;
}
interface BrowserNotice {
  emailPreview: unknown;
  fetchUnreadCount(): Promise<void>;
  closeEmailPreview(): void;
}
interface BrowserToast {
  messages: unknown[];
  removeMessage(id: string): void;
}

declare global {
  interface Window {
    __rgaaFormsHost?: {
      app: BrowserApp;
      refreshNotifications(): Promise<void>;
      navigation: string[];
    };
  }
}

export async function mountFormsScene(
  page: Page,
  scene: "markdown" | "report" | "notifications",
) {
  if (scene === "markdown") {
    await mountProductionScene(
      page,
      "/src/components/form/application/ApplicationMainStep.vue",
      {
        modelValue: {
          label: "Application fictive Alpha",
          shortName: "ALPHA-TEST",
          description: "Alpha",
          businessDivisionIds: [],
          purposes: [],
          targetPopulations: [],
          status: { status: "in_production" },
          type: null,
          logo: "",
        },
        errors: {},
        isCreateMode: false,
        canEditBase: true,
      },
    );
    await page.evaluate(async () => {
      const path = "/src/composables/use-mermaid.ts";
      const source = (await import(path)) as { vUseMermaid: unknown };
      const app = window.__rgaaAtHost?.app as unknown as
        | Pick<BrowserApp, "directive">
        | undefined;
      app?.directive("use-mermaid", source.vUseMermaid);
    });
    return;
  }
  await page.evaluate(async (scene) => {
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
      const path = specifiers.find((value) => value.includes(fragment));
      if (!path)
        throw new Error(`Dépendance du vrai client absente : ${fragment}`);
      return path;
    };
    const vue = (await import(dependency("/vue.js"))) as BrowserVue;
    const pinia = (await import(dependency("/pinia.js"))) as {
      createPinia(): unknown;
    };
    const routing = (await import(dependency("/vue-router.js"))) as {
      createRouter(options: unknown): {
        afterEach(callback: (route: { path: string }) => void): void;
      };
      createMemoryHistory(): unknown;
    };
    const dsfr = (await import(dependency("vue-dsfr"))) as Record<
      string,
      unknown
    >;
    const paths = {
      user: "/src/stores/userStore.ts",
      notices: "/src/stores/notificationStore.ts",
      toaster: "/src/stores/toasterStore.ts",
      report: "/src/components/modal/ReportModal.vue",
      bell: "/src/components/notification/NotificationBell.vue",
      email: "/src/components/EmailPreviewModal.vue",
      appToaster: "/src/components/AppToaster.vue",
    };
    const stores = (await import(paths.user)) as {
      useUserStore(root: unknown): BrowserUser;
    };
    const notificationStores = (await import(paths.notices)) as {
      useNotificationStore(root: unknown): BrowserNotice;
    };
    const toasterStores = (await import(paths.toaster)) as {
      useToasterStore(root: unknown): BrowserToast;
    };
    const report = (await import(paths.report)) as { default: unknown };
    const bell = (await import(paths.bell)) as { default: unknown };
    const email = (await import(paths.email)) as { default: unknown };
    const toasterComponent = (await import(paths.appToaster)) as {
      default: unknown;
    };
    const root = document.getElementById("app") as
      | (HTMLElement & { __vue_app__?: BrowserApp })
      | null;
    root?.__vue_app__?.unmount();
    window.__rgaaAtHost?.app.unmount();
    window.__rgaaFormsHost?.app.unmount();
    document.getElementById("at-live-scene")?.remove();
    document.getElementById("at-forms-scene")?.remove();
    const container = document.createElement("main");
    container.id = "at-forms-scene";
    document.body.append(container);
    document.title = `RefApp — ${scene === "report" ? "signalement" : "notifications"} synthétique NVDA`;
    const opened = vue.ref(false),
      storeRoot = pinia.createPinia();
    const notificationStore =
      notificationStores.useNotificationStore(storeRoot);
    const toaster = toasterStores.useToasterStore(storeRoot);
    const navigation: string[] = [];
    const router = routing.createRouter({
      history: routing.createMemoryHistory(),
      routes: [
        { path: "/", component: { template: "<p></p>" } },
        { path: "/notifications", component: { template: "<p></p>" } },
        { path: "/applications/:id", component: { template: "<p></p>" } },
      ],
    });
    router.afterEach((route) => navigation.push(route.path));
    const app = vue.createApp({
      setup: () => () =>
        vue.h("section", { "data-testid": "native-synthetic-host" }, [
          vue.h(
            "h1",
            null,
            scene === "report"
              ? "Signalement — scène synthétique"
              : "Notifications — scène synthétique",
          ),
          scene === "report"
            ? vue.h(
                "button",
                {
                  type: "button",
                  "data-testid": "report-host-open",
                  onClick: () => {
                    opened.value = true;
                  },
                },
                "Signaler une application manquante",
              )
            : null,
          scene === "report"
            ? vue.h(report.default, {
                opened: opened.value,
                context: "global",
                onClose: () => {
                  opened.value = false;
                },
              })
            : vue.h(bell.default),
          vue.h(email.default, {
            opened: notificationStore.emailPreview !== null,
            log: notificationStore.emailPreview,
            onClose: () => notificationStore.closeEmailPreview(),
          }),
          vue.h(toasterComponent.default, {
            messages: toaster.messages,
            onCloseMessage: (id: string) => toaster.removeMessage(id),
          }),
        ]),
    });
    app.use(storeRoot);
    app.use(router);
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
    window.__rgaaFormsHost = {
      app,
      refreshNotifications: () => notificationStore.fetchUnreadCount(),
      navigation,
    };
    if (scene === "notifications") await notificationStore.fetchUnreadCount();
  }, scene);
}

export async function finishForms(
  page: Page,
  network: Awaited<ReturnType<typeof simulatedFormsNetwork>>,
  info: TestInfo,
) {
  await info.attach("forms-network-synthetic-only", {
    body: Buffer.from(
      JSON.stringify(
        {
          baseCalls: network.calls,
          calls: network.formsCalls,
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
    path: info.outputPath("forms-final.png"),
    fullPage: true,
  });
}
