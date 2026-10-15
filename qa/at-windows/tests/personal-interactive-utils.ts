import { expect, type Page, type TestInfo } from "@playwright/test";
import { simulatedNetwork, mountProductionScene } from "./interactive-utils.js";

export const personalUserId = "user-personal-synthetic";
export const personalActorTypeId = "actor-type-personal-synthetic";
export const personalOrganizations = [
  {
    id: "org-personal-initial",
    label: "Organisation initiale fictive",
    path: "Test/Organisation initiale fictive",
    parentId: null,
  },
  {
    id: "org-personal-selected",
    label: "Organisation choisie fictive",
    path: "Test/Organisation choisie fictive",
    parentId: null,
  },
  {
    id: "org-personal-scope",
    label: "Perimetre personnel fictif",
    path: "Test/Perimetre personnel fictif",
    parentId: null,
  },
];

export function initialPersonalUser() {
  return {
    id: personalUserId,
    email: "personnel@example.invalid",
    role: "READER",
    organization: personalOrganizations[0],
    organizationId: personalOrganizations[0].id,
    scopeOrganization: personalOrganizations[2],
    scopeOrganizationId: personalOrganizations[2].id,
    permissions: ["AppRead", "MetadataRead"],
    additionalPermissions: ["CreateApplication", "GristSync"],
    authLevel: { downgraded: false },
    isBlocked: false,
    type: "human",
    emailNotificationsEnabled: false,
    followedApplications: [],
    gristUrl: null,
    gristDocIds: [],
    hasGristApiKey: false,
  };
}

export const initialPersonalMatrix = {
  actorTypeId: personalActorTypeId,
  AppRead: true,
  AppWrite: false,
  AppWritePriority: false,
  HostingRead: false,
  HostingWrite: false,
  LinkRead: false,
  LinkWrite: false,
  ComplianceRead: false,
  ComplianceWrite: false,
  ActorRead: false,
  ActorWrite: false,
  TechnologyRead: false,
  TechnologyWrite: false,
  RelationRead: false,
  RelationWrite: false,
  DataRead: true,
  DataWrite: false,
  MetadataRead: false,
  ReportRead: true,
  ReportPost: true,
  ReportManage: false,
};

export async function personalNetwork(
  page: Page,
  options: { downgraded?: boolean } = {},
) {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const base = await simulatedNetwork(page);
  const target = initialPersonalUser();
  if (options.downgraded) {
    target.role = "VISITOR";
    target.authLevel.downgraded = true;
    target.permissions = ["AppRead"];
    target.additionalPermissions = [];
  }
  const state = {
    userMode: "error" as "error" | "success",
    syncMode: "error" as "error" | "success",
    suggestionMode: "error" as "error" | "success",
    matrixMode: "error" as "error" | "success",
    delayMs: 900,
  };
  let persistedMatrix = [{ ...initialPersonalMatrix }];
  const personalCalls: {
    method: string;
    pathname: string;
    query: string;
    status: number;
    body?: unknown;
  }[] = [];
  const personalStarted: {
    method: string;
    pathname: string;
    body?: unknown;
  }[] = [];
  type ReplyKind = "suggestion" | "user" | "sync" | "matrix";
  const held = new Set<ReplyKind>();
  const pending: { kind: ReplyKind; resolve(): void }[] = [];
  async function pause(kind: ReplyKind) {
    if (!held.has(kind)) return;
    await new Promise<void>((resolve) => pending.push({ kind, resolve }));
  }
  function release(kind: ReplyKind) {
    held.delete(kind);
    for (let index = pending.length - 1; index >= 0; index--) {
      if (pending[index].kind === kind) pending.splice(index, 1)[0].resolve();
    }
  }
  await page.context().route("**/api/v2/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url()),
      method = request.method();
    if (url.origin !== new URL(base.base).origin) return route.fallback();
    let data: unknown,
      status = 200;
    let body: unknown;
    if (method === "GET" && url.pathname === "/api/v2/users/me") {
      data = {
        ...initialPersonalUser(),
        id: "user-synthetic-001",
        email: "admin@example.invalid",
        role: "ADMIN",
        organization: null,
        organizationId: null,
        scopeOrganization: null,
        scopeOrganizationId: null,
        permissions: [
          "AdminPanelManage",
          "GlobalAdminManage",
          "ActorWrite",
          "ActorTypeManage",
          "ActorTypePost",
        ],
      };
    } else if (method === "GET" && url.pathname === "/api/v2/organizations") {
      data = {
        results: personalOrganizations,
        total: personalOrganizations.length,
      };
    } else if (
      method === "GET" &&
      personalOrganizations.some(
        (org) => url.pathname === `/api/v2/organizations/${org.id}`,
      )
    ) {
      data = personalOrganizations.find((org) =>
        url.pathname.endsWith(`/${org.id}`),
      );
    } else if (
      method === "GET" &&
      decodeURIComponent(url.pathname) ===
        `/api/v2/users/by-email/${target.email}/sync-organization-from-maia`
    ) {
      await pause("suggestion");
      await new Promise((resolve) => setTimeout(resolve, state.delayMs));
      status = state.suggestionMode === "success" ? 200 : 500;
      data =
        status === 200
          ? {
              organizationId: personalOrganizations[1].id,
              organizationPath: personalOrganizations[1].path,
              firstName: "Camille",
              lastName: "Fictif",
            }
          : { message: "Suggestion MAIA fictivement indisponible" };
    } else if (
      method === "PATCH" &&
      url.pathname === `/api/v2/users/${personalUserId}`
    ) {
      body = request.postDataJSON() as Record<string, unknown>;
      personalStarted.push({ method, pathname: url.pathname, body });
      await pause("user");
      await new Promise((resolve) => setTimeout(resolve, state.delayMs));
      status = state.userMode === "success" ? 200 : 500;
      if (status === 200) {
        const update = body as Record<string, unknown>;
        if (typeof update.role === "string") target.role = update.role;
        if (typeof update.organizationId === "string") {
          target.organizationId = update.organizationId;
          target.organization =
            personalOrganizations.find(
              (org) => org.id === update.organizationId,
            ) ?? personalOrganizations[0];
        }
        if (typeof update.scopeOrganizationId === "string") {
          target.scopeOrganizationId = update.scopeOrganizationId;
          target.scopeOrganization =
            personalOrganizations.find(
              (org) => org.id === update.scopeOrganizationId,
            ) ?? personalOrganizations[2];
        }
        if (Array.isArray(update.additionalPermissions))
          target.additionalPermissions = update.additionalPermissions.filter(
            (value): value is string => typeof value === "string",
          );
        data = { ...target };
      } else data = { message: "Modification utilisateur fictivement refusée" };
    } else if (
      method === "POST" &&
      url.pathname ===
        `/api/v2/users/${personalUserId}/sync-organization-from-maia`
    ) {
      personalStarted.push({ method, pathname: url.pathname });
      await pause("sync");
      await new Promise((resolve) => setTimeout(resolve, state.delayMs));
      status = state.syncMode === "success" ? 200 : 500;
      if (status === 200) {
        target.organizationId = personalOrganizations[1].id;
        target.organization = personalOrganizations[1];
        data = { ...target };
      } else
        data = { message: "Synchronisation individuelle fictivement refusée" };
    } else if (
      method === "GET" &&
      url.pathname === `/api/v2/users/${personalUserId}/permission-logs`
    ) {
      data = { results: [], total: 0 };
    } else if (method === "GET" && url.pathname === "/api/v2/actorTypes") {
      data = {
        results: [
          {
            id: personalActorTypeId,
            code: "MOA",
            label: "Maitrise fictive personnelle",
            description: "Type fictif de test",
            isDefault: false,
          },
        ],
        total: 1,
      };
    } else if (
      method === "GET" &&
      url.pathname === "/api/v2/actorTypes/perms-matrix"
    ) {
      data = persistedMatrix.map((row) => ({ ...row }));
    } else if (
      method === "PATCH" &&
      url.pathname === "/api/v2/actorTypes/perms-matrix"
    ) {
      body = request.postDataJSON() as unknown;
      personalStarted.push({ method, pathname: url.pathname, body });
      await pause("matrix");
      await new Promise((resolve) => setTimeout(resolve, state.delayMs));
      status = state.matrixMode === "success" ? 200 : 500;
      if (status === 200) {
        if (!Array.isArray(body))
          throw new Error("Matrice fictive attendue en tableau");
        persistedMatrix = body as typeof persistedMatrix;
        data = persistedMatrix.map((row) => ({ ...row }));
      } else data = { message: "Matrice fictivement refusée" };
    } else return route.fallback();
    personalCalls.push({
      method,
      pathname: url.pathname,
      query: url.search,
      status,
      ...(body === undefined ? {} : { body }),
    });
    await route.fulfill({ status, json: data });
  });
  return {
    ...base,
    personalState: state,
    personalCalls,
    personalStarted,
    pageErrors,
    target,
    persistedMatrix: () => persistedMatrix,
    hold: (kind: ReplyKind) => held.add(kind),
    pending,
    release,
    cancelPending: () => {
      for (const kind of [...held]) release(kind);
    },
  };
}

export async function mountPersonalScene(
  page: Page,
  network: Awaited<ReturnType<typeof personalNetwork>>,
  kind: "user" | "permissions" | "matrix",
) {
  await page.goto(network.base);
  const main = await page.evaluate(async () =>
    (await fetch("/src/main.ts")).text(),
  );
  const vue = [...main.matchAll(/from\s+["']([^"']+)["']/g)]
    .map((match) => match[1])
    .find((source) => source.includes("/vue.js"));
  if (!vue) throw new Error("Import Vue réel introuvable");
  const host = `import {defineComponent,h,ref} from ${JSON.stringify(vue)};
import UserActions from '/src/components/admin/UserActions.vue';
import UserPermissionsModal from '/src/components/admin/UserPermissionsModal.vue';
import AdminPermsMatrixTab from '/src/components/admin/AdminPermsMatrixTab.vue';
import AppToaster from '/src/components/AppToaster.vue';
import {useToasterStore} from '/src/stores/toasterStore.ts';
export default defineComponent({props:['kind','target'],setup(props){const user=ref(props.target),toaster=useToasterStore();return()=>h('section',{'data-testid':'personal-production-scene'},[h('h1','Droits personnels — scène synthétique'),props.kind==='user'?h(UserActions,{user:user.value,onUserUpdated:value=>user.value=value}):props.kind==='permissions'?h(UserPermissionsModal,{user:user.value}):h(AdminPermsMatrixTab),h('output',{'data-testid':'personal-target-organization'},user.value.organization?.path??''),h(AppToaster,{messages:toaster.messages,onCloseMessage:id=>toaster.removeMessage(id)})]);}});`;
  await page.route("**/src/at-personal-host.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: host }),
  );
  await mountProductionScene(page, "/src/at-personal-host.js", {
    kind,
    target: network.target,
  });
  await expect(page.getByTestId("personal-production-scene")).toBeVisible();
}

export async function observePersonal(
  page: Page,
  info: TestInfo,
  name: string,
) {
  const observation = await page.evaluate(() => ({
    activeTag: document.activeElement?.tagName,
    activeId: document.activeElement?.id,
    activeTestId: document.activeElement?.getAttribute("data-testid"),
    dialogs: [
      ...document.querySelectorAll<HTMLElement>(
        'dialog[open], [role="dialog"]:not([aria-hidden="true"])',
      ),
    ].map((dialog) => ({
      title: dialog.getAttribute("aria-labelledby"),
      focusWithin: dialog.contains(document.activeElement),
      text: dialog.innerText,
      alerts: [...dialog.querySelectorAll('[role="alert"]')].map(
        (element) => element.textContent,
      ),
    })),
    liveRegions: [
      ...document.querySelectorAll(
        'output,[role="alert"],[role="status"],[aria-live]',
      ),
    ].map((element) => ({
      role: element.getAttribute("role"),
      live: element.getAttribute("aria-live"),
      text: element.textContent,
    })),
    matrixStates: [...document.querySelectorAll("[data-state]")].map(
      (element) => ({
        testId: element.getAttribute("data-testid"),
        state: element.getAttribute("data-state"),
      }),
    ),
  }));
  await info.attach(name, {
    body: Buffer.from(JSON.stringify(observation)),
    contentType: "application/json",
  });
  await page.screenshot({
    path: info.outputPath(`${name}.png`),
    fullPage: true,
  });
  return observation;
}

export async function finishPersonal(
  page: Page,
  network: Awaited<ReturnType<typeof personalNetwork>>,
  info: TestInfo,
) {
  await info.attach("personal-network-simulated-only", {
    body: Buffer.from(
      JSON.stringify({
        calls: [...network.calls, ...network.personalCalls],
        startedMutations: network.personalStarted,
        pageErrors: network.pageErrors,
        unhandled: network.unhandled,
        actualBusinessWrites: 0,
        realProviderRequests: 0,
      }),
    ),
    contentType: "application/json",
  });
  expect(network.unhandled).toEqual([]);
  expect(network.pageErrors).toEqual([]);
  await page.screenshot({
    path: info.outputPath("personal-final.png"),
    fullPage: true,
  });
}
