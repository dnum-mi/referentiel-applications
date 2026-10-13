import { expect, type Page, type TestInfo } from "@playwright/test";
import { simulatedNetwork, mountProductionScene } from "./interactive-utils.js";

export async function setupGrist(page: Page, kind: "settings" | "sync") {
  const base = await simulatedNetwork(page);
  const user = {
    id: "user-synthetic-001",
    email: "fictif@example.invalid",
    role: "ADMIN",
    type: "human",
    permissions: ["GristSync"],
    additionalPermissions: [],
    organization: null,
    scopeOrganization: null,
    organizationId: null,
    scopeOrganizationId: null,
    isBlocked: false,
    followedApplications: [],
    emailNotificationsEnabled: false,
    gristUrl: "https://grist.example.invalid",
    hasGristApiKey: kind === "sync",
    gristDocIds: Array.from(
      { length: 20 },
      (_, i) => `doc${String(i).padStart(3, "0")}`,
    ),
  };
  const state = {
    preferences: "error" as "error" | "success",
    sync: "error" as "error" | "success",
    tables: "ok" as "ok" | "error",
  };
  const calls: {
    method: string;
    path: string;
    body: unknown;
    status: number;
  }[] = [];
  await page.context().route("**/api/v2/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      method = req.method();
    if (url.origin !== new URL(base.base).origin) return route.fallback();
    let data: unknown,
      status = 200,
      body: unknown = null;
    if (method === "GET" && url.pathname === "/api/v2/users/me") data = user;
    else if (method === "PATCH" && url.pathname === "/api/v2/users/me") {
      body = req.postDataJSON();
      await new Promise((resolve) => setTimeout(resolve, 450));
      if (state.preferences === "error") {
        status = 500;
        data = { message: "Enregistrement Grist fictivement refusé" };
      } else {
        if (!body || typeof body !== "object")
          throw new Error("Expected preference body");
        if ("gristUrl" in body && typeof body.gristUrl === "string")
          user.gristUrl = body.gristUrl;
        if ("gristApiKey" in body)
          user.hasGristApiKey =
            typeof body.gristApiKey === "string" && body.gristApiKey.length > 0;
        if (
          "gristDocIds" in body &&
          Array.isArray(body.gristDocIds) &&
          body.gristDocIds.every((x) => typeof x === "string")
        )
          user.gristDocIds = body.gristDocIds;
        data = user;
      }
    } else if (method === "GET" && url.pathname === "/api/v2/grist/tables") {
      if (state.tables === "error") {
        status = 500;
        data = { message: "Documents fictivement indisponibles" };
      } else
        data = [
          { docId: "doc001", tables: ["RefApp", "RefApp2"] },
          { docId: "doc002", tables: [] },
          { docId: "doc003", tables: [], error: "Lecture fictivement refusée" },
        ];
    } else if (method === "POST" && url.pathname === "/api/v2/grist/setup") {
      body = req.postDataJSON();
      await new Promise((resolve) => setTimeout(resolve, 450));
      if (state.sync === "error") {
        status = 500;
        data = { message: "Synchronisation fictivement refusée" };
      } else
        data = {
          documents: [
            {
              docId: "doc001",
              tableId: "RefApp",
              status: "ok",
              rowsWritten: 2,
              rowsGreyed: 0,
              rowsDeleted: 0,
            },
          ],
        };
    } else return route.fallback();
    calls.push({ method, path: url.pathname, body, status });
    await route.fulfill({ status, json: data });
  });
  await page.goto(base.base);
  const main = await page.evaluate(
    async () => await (await fetch("/src/main.ts")).text(),
  );
  const vue = [...main.matchAll(/from\s+["']([^"']+)["']/g)]
    .map((m) => m[1])
    .find((s) => s.includes("/vue.js"));
  if (!vue) throw new Error("Actual Vue import missing");
  const host = `import {defineComponent,h} from ${JSON.stringify(vue)};
import Settings from '/src/components/users/UserGristSettings.vue';
import Actions from '/src/components/ApplicationSearchActions.vue';
import AppToaster from '/src/components/AppToaster.vue';
import {useToasterStore} from '/src/stores/toasterStore.ts';
export default defineComponent({props:['kind'],setup(props){const toaster=useToasterStore();return()=>h('section',[h('h1','Grist synthétique'),props.kind==='settings'?h(Settings):h(Actions),h(AppToaster,{messages:toaster.messages,onCloseMessage:id=>toaster.removeMessage(id)})]);}});`;
  await page.route("**/src/at-grist-host.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: host }),
  );
  await mountProductionScene(page, "/src/at-grist-host.js", { kind });
  return { ...base, user, state, gristCalls: calls };
}
export async function finishGrist(
  page: Page,
  network: Awaited<ReturnType<typeof setupGrist>>,
  info: TestInfo,
) {
  await info.attach("grist-only-intercepted-network", {
    body: JSON.stringify({
      calls: network.gristCalls,
      unhandled: network.unhandled,
      actualExternalWrites: 0,
    }),
    contentType: "application/json",
  });
  expect(network.unhandled).toEqual([]);
  await page.screenshot({
    path: info.outputPath("grist-final.png"),
    fullPage: true,
  });
}
