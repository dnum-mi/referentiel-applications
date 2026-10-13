import { expect, type Page, type TestInfo } from "@playwright/test";
import {
  simulatedNetwork,
  mountProductionScene,
  alpha,
  beta,
} from "./interactive-utils.js";
export const targetUser = {
  id: "user-target-synthetic",
  email: "target@example.invalid",
  role: "READER",
  organization: null,
  scopeOrganization: null,
  organizationId: null,
  scopeOrganizationId: null,
  additionalPermissions: [],
  permissions: [],
  isBlocked: false,
  type: "human",
  emailNotificationsEnabled: false,
  followedApplications: [],
  gristDocIds: [],
  gristUrl: null,
  hasGristApiKey: false,
};
export const targetActor = {
  id: "actor-u13-synthetic",
  applicationId: alpha,
  actorTypeId: "type-u13-synthetic",
  organizationId: null,
  email: "actor@example.invalid",
  firstname: "Camille",
  lastname: "Fictif",
  isGroup: false,
};
export async function setupU13(page: Page, kind: "user" | "actor") {
  const base = await simulatedNetwork(page);
  const calls: { method: string; path: string; status: number }[] = [];
  const state = {
    mode: "error" as "error" | "success",
    delay: 800,
    lookup: "ok" as "ok" | "error",
  };
  await page.context().route("**/api/v2/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      method = request.method();
    if (url.origin !== new URL(base.base).origin) return route.fallback();
    let data: unknown,
      status = 200;
    if (method === "GET" && url.pathname === "/api/v2/users/me")
      data = {
        ...targetUser,
        id: "user-synthetic-001",
        email: "admin@example.invalid",
        role: "ADMIN",
        permissions: ["AdminPanelManage", "GlobalAdminManage", "ActorWrite"],
      };
    else if (
      method === "GET" &&
      url.pathname === "/api/v2/actors/applications-by-email"
    ) {
      status = state.lookup === "ok" ? 200 : 500;
      data =
        status === 200
          ? [
              { id: alpha, label: "Alpha fictive" },
              { id: beta, label: "Beta fictive" },
            ]
          : { message: "Recherche fictivement indisponible" };
    } else if (method === "GET" && url.pathname === "/api/v2/actorTypes")
      data = {
        results: [
          {
            id: targetActor.actorTypeId,
            code: "MOA",
            label: "Maitrise fictive",
            isDefault: false,
          },
        ],
        total: 1,
      };
    else if (
      method === "GET" &&
      url.pathname.startsWith("/api/v2/users/by-email/") &&
      url.pathname.endsWith("/sync-organization-from-maia")
    ) {
      status = 500;
      data = { message: "Suggestion MAIA indisponible, simulation" };
    } else if (
      ["POST", "PATCH", "DELETE"].includes(method) &&
      [
        `/api/v2/users/${targetUser.id}`,
        `/api/v2/users/${targetUser.id}/block`,
        `/api/v2/users/${targetUser.id}/unblock`,
        `/api/v2/users/${targetUser.id}/impersonate`,
        `/api/v2/users/${targetUser.id}/sync-organization-from-maia`,
        `/api/v2/actors/${targetActor.id}`,
        "/api/v2/actors/by-email",
      ].includes(url.pathname)
    ) {
      await new Promise((resolve) => setTimeout(resolve, state.delay));
      status = state.mode === "error" ? 500 : 200;
      data =
        status === 500
          ? { message: "Refus serveur synthétique" }
          : url.pathname.startsWith("/api/v2/users/")
            ? { ...targetUser, isBlocked: true }
            : { count: 2 };
    } else return route.fallback();
    calls.push({ method, path: url.pathname, status });
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
  const host = `import {defineComponent,h,ref} from ${JSON.stringify(vue)};import UserActions from '/src/components/admin/UserActions.vue';import AdminActorActions from '/src/components/admin/AdminActorActions.vue';import AppToaster from '/src/components/AppToaster.vue';import {useToasterStore} from '/src/stores/toasterStore.ts';export default defineComponent({props:['kind','targetUser','targetActor'],setup(props){const user=ref(props.targetUser),toaster=useToasterStore();return()=>h('section',[h('h1','Administration synthétique U13'),props.kind==='user'?h(UserActions,{user:user.value,onUserUpdated:value=>user.value=value}):h(AdminActorActions,{actor:props.targetActor,actorTypes:[{id:props.targetActor.actorTypeId,code:'MOA',label:'Maitrise fictive',isDefault:false}]}),h(AppToaster,{messages:toaster.messages,onCloseMessage:id=>toaster.removeMessage(id)})]);}})`;
  await page.route("**/src/at-u13-host.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: host }),
  );
  await mountProductionScene(page, "/src/at-u13-host.js", {
    kind,
    targetUser,
    targetActor,
  });
  return { ...base, state, u13Calls: calls };
}
export async function finishU13(
  page: Page,
  network: Awaited<ReturnType<typeof setupU13>>,
  info: TestInfo,
) {
  await info.attach("synthetic-only-network", {
    body: JSON.stringify({
      calls: network.u13Calls,
      unhandled: network.unhandled,
      actualWrites: 0,
    }),
    contentType: "application/json",
  });
  await page.screenshot({ path: info.outputPath("final.png"), fullPage: true });
  expect(network.unhandled).toEqual([]);
}
