import { expect, type Page, type TestInfo } from "@playwright/test";
import {
  alpha,
  beta,
  gamma,
  mountProductionScene,
  simulatedNetwork,
} from "./interactive-utils.js";

export const personalId = "77777777-7777-4777-8777-777777777777";
export const createdPersonalId = "88888888-8888-4888-8888-888888888888";
export const noticeIds = [alpha, beta, gamma];

export async function profileNotificationsNetwork(page: Page) {
  const base = await simulatedNetwork(page);
  const me = {
    id: "user-synthetic-001",
    email: "profile@example.invalid",
    role: "ADMIN",
    permissions: ["LinkWrite", "RelationWrite"],
    additionalPermissions: [],
    emailNotificationsEnabled: false,
    followedApplications: [
      { id: alpha, label: "Application fictive Alpha" },
      { id: beta, label: "Application fictive Bêta" },
    ],
    gristDocIds: [],
    gristUrl: "",
    hasGristApiKey: false,
  };
  const tokens = [
    {
      id: personalId,
      kind: "personal",
      serviceMode: "delegated",
      name: "Token personnel fictif",
      description: "Description fictive",
      status: "active",
      role: "VISITOR",
      expiresAt: "2027-01-01",
      createdBy: { id: me.id, email: me.email },
    },
  ];
  const notices = noticeIds.map((id, index) => ({
    id,
    userId: me.id,
    message: `Notification fictive ${["Alpha", "Bêta", "Gamma"][index]}`,
    type: "APPLICATION_UPDATED",
    createdAt: "2026-10-13T09:00:00Z",
    isRead: false,
    link: null,
    emailLogId: null,
  }));
  const calls: {
    method: string;
    pathname: string;
    outcome: string;
    status?: number;
    body?: unknown;
  }[] = [];
  const pending: {
    method: string;
    pathname: string;
    body: Record<string, unknown>;
    resolve(outcome: "error" | "success"): void;
  }[] = [];
  await page.context().route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      method = request.method();
    if (url.origin !== new URL(base.base).origin) return route.fallback();
    const tokenPath = [personalId, createdPersonalId].some(
      (id) => url.pathname === `/api/v2/tokens/personal/${id}`,
    );
    const followPath = [alpha, beta].some(
      (id) => url.pathname === `/api/v2/users/me/subscribe/${id}`,
    );
    const noticePath = noticeIds.some(
      (id) =>
        url.pathname === `/api/v2/notifications/${id}` ||
        url.pathname === `/api/v2/notifications/${id}/read`,
    );
    const known =
      [
        "/api/v2/users/me",
        "/api/v2/tokens/personal",
        "/api/v2/notifications",
        "/api/v2/notifications/unread-count",
        "/api/v2/notifications/read-all",
        "/api/v2/notifications/bulk",
      ].includes(url.pathname) ||
      tokenPath ||
      followPath ||
      noticePath;
    if (!known) return route.fallback();
    const record: (typeof calls)[number] = {
      method,
      pathname: url.pathname,
      outcome: method === "GET" ? "synthetic-read" : "pending-intercepted",
    };
    calls.push(record);
    if (method === "GET") {
      let data: unknown;
      if (url.pathname === "/api/v2/users/me") data = me;
      else if (url.pathname === "/api/v2/tokens/personal")
        data = tokens.filter((token) => token.status !== "revoked");
      else if (url.pathname === "/api/v2/notifications")
        data = { results: notices, total: notices.length };
      else if (url.pathname === "/api/v2/notifications/unread-count")
        data = { count: notices.filter((n) => !n.isRead).length };
      else {
        record.outcome = "blocked-method";
        await route.abort("blockedbyclient");
        return;
      }
      record.status = 200;
      await route.fulfill({ json: data });
      return;
    }
    const allowed =
      (method === "POST" && url.pathname === "/api/v2/tokens/personal") ||
      (method === "PATCH" &&
        [
          "/api/v2/users/me",
          "/api/v2/notifications/read-all",
          ...noticeIds.map((id) => `/api/v2/notifications/${id}/read`),
        ].includes(url.pathname)) ||
      (method === "DELETE" &&
        (tokenPath ||
          followPath ||
          noticeIds.some(
            (id) => url.pathname === `/api/v2/notifications/${id}`,
          ) ||
          url.pathname === "/api/v2/notifications/bulk"));
    if (!allowed) {
      record.outcome = "blocked-method";
      await route.abort("blockedbyclient");
      return;
    }
    const parsed: unknown = request.postDataJSON();
    const body =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    record.body = body;
    const outcome = await new Promise<"error" | "success">((resolve) =>
      pending.push({ method, pathname: url.pathname, body, resolve }),
    );
    record.outcome = outcome;
    record.status =
      outcome === "error"
        ? 500
        : method === "POST"
          ? 201
          : tokenPath || url.pathname.startsWith("/api/v2/notifications/")
            ? 204
            : 200;
    if (outcome === "error") {
      await route.fulfill({
        status: 500,
        json: { message: "Défaillance G5 entièrement fictive" },
      });
      return;
    }
    let result: unknown = {};
    if (url.pathname === "/api/v2/users/me") {
      me.emailNotificationsEnabled = body.emailNotificationsEnabled === true;
      result = me;
    } else if (followPath) {
      me.followedApplications = me.followedApplications.filter(
        (app) => !url.pathname.endsWith(app.id),
      );
      result = me;
    } else if (method === "POST") {
      const created = {
        ...tokens[0],
        id: createdPersonalId,
        role: me.role,
        name: String(body.name),
        description: String(body.description),
        expiresAt: String(body.expiresAt),
      };
      tokens.push(created);
      result = { ...created, password: "SYNTHETIC_G5_TOKEN_NOT_A_CREDENTIAL" };
    } else if (tokenPath) {
      const token = tokens.find((token) => url.pathname.endsWith(token.id));
      if (token) token.status = "revoked";
    } else if (url.pathname === "/api/v2/notifications/read-all")
      notices.forEach((n) => {
        n.isRead = true;
      });
    else if (url.pathname.endsWith("/read")) {
      const notice = notices.find((n) =>
        url.pathname.endsWith(`/${n.id}/read`),
      );
      if (notice) notice.isRead = true;
    } else {
      const ids =
        url.pathname.endsWith("/bulk") && Array.isArray(body.ids)
          ? body.ids
          : [url.pathname.split("/").at(-1)];
      for (let i = notices.length - 1; i >= 0; i--)
        if (ids.includes(notices[i].id)) notices.splice(i, 1);
    }
    if (record.status === 204) await route.fulfill({ status: 204, body: "" });
    else await route.fulfill({ status: record.status, json: result });
  });
  return {
    ...base,
    g5Calls: calls,
    pending,
    release(outcome: "error" | "success") {
      const request = pending.shift();
      if (!request) throw new Error("No G5 intercepted mutation pending.");
      request.resolve(outcome);
    },
    cancelPending() {
      for (const request of pending.splice(0)) request.resolve("error");
    },
  };
}

export async function mountG5Scene(
  page: Page,
  scene: "profile" | "notifications" | "bell",
) {
  await mountProductionScene(
    page,
    scene === "profile"
      ? "/src/views/UserProfilePage.vue"
      : scene === "notifications"
        ? "/src/views/NotificationsPage.vue"
        : "/src/components/notification/NotificationBell.vue",
  );
  await page.evaluate(async () => {
    const main = await (await fetch("/src/main.ts")).text();
    const vuePath = [...main.matchAll(/from\s+["']([^"']+)["']/g)]
      .map((m) => m[1])
      .find((p) => p.includes("/vue.js"));
    if (!vuePath) throw new Error("Real Vue unavailable.");
    const vue = (await import(vuePath)) as {
      createApp(component: unknown): { mount(element: HTMLElement): unknown };
      h(component: unknown, props: Record<string, unknown>): unknown;
    };
    const toastStorePath = "/src/stores/toasterStore.ts",
      componentPath = "/src/components/AppToaster.vue",
      noticeStorePath = "/src/stores/notificationStore.ts";
    const stores = (await import(toastStorePath)) as {
      useToasterStore(): {
        messages: unknown[];
        removeMessage(id: string): void;
      };
    };
    const component = (await import(componentPath)) as { default: unknown };
    const notifications = (await import(noticeStorePath)) as {
      useNotificationStore(): { fetchUnreadCount(): Promise<void> };
    };
    const store = stores.useToasterStore(),
      host = document.createElement("div");
    host.id = "at-g5-toaster";
    document.body.append(host);
    vue
      .createApp({
        setup: () => () =>
          vue.h(component.default, {
            messages: store.messages,
            onCloseMessage: (id: string) => store.removeMessage(id),
          }),
      })
      .mount(host);
    await notifications.useNotificationStore().fetchUnreadCount();
  });
  await expect(page.locator("#at-live-scene")).toBeVisible();
}

export async function finishG5(
  page: Page,
  network: Awaited<ReturnType<typeof profileNotificationsNetwork>>,
  info: TestInfo,
) {
  expect(network.unhandled).toEqual([]);
  expect(
    network.g5Calls.some((call) => call.outcome === "blocked-method"),
  ).toBe(false);
  expect(network.pending).toHaveLength(0);
  await info.attach("strict-synthetic-g5-network", {
    body: Buffer.from(
      JSON.stringify(
        {
          calls: network.g5Calls,
          unhandled: network.unhandled,
          realBusinessWrites: false,
        },
        null,
        2,
      ),
    ),
    contentType: "application/json",
  });
  await page.screenshot({ path: info.outputPath("g5.png"), fullPage: true });
}
