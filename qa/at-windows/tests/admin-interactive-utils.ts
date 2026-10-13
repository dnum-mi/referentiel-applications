import { expect, type Page, type TestInfo } from "@playwright/test";
import {
  mountProductionScene,
  simulatedNetwork,
  alpha,
  beta,
} from "./interactive-utils.js";

const id = (n: number) =>
  `${String(n).padStart(8, "0")}-1111-4111-8111-111111111111`;
export const adminScenes = {
  organization: {
    component: "AdminOrganizationsTab",
    resource: "organizations",
    row: {
      id: id(1),
      path: "ORG/FAKE",
      sigle: "FAKE",
      url: "https://organization.example.invalid",
      businessDivisionId: id(2),
      businessDivision: { id: id(2), label: "Direction fictive" },
      maiaReferences: [],
    },
  },
  business: {
    component: "AdminBusinessDivisionsTab",
    resource: "business-division",
    row: { id: id(2), label: "Direction fictive" },
  },
  tags: {
    component: "AdminTagsTab",
    resource: "tags",
    row: { id: id(3), name: "tag-qa" },
  },
  sources: {
    component: "AdminLabelSourcesTab",
    resource: "label-sources",
    row: { id: id(4), source: "SOURCE_QA" },
  },
  hosting: {
    component: "AdminHostingOptionsTab",
    resource: "hosting-options",
    row: {
      id: id(5),
      provider: "Fournisseur fictif",
      platform: "Plateforme fictive",
      site: "Site fictif",
      building: null,
      room: null,
      hostingsCount: 2,
    },
  },
  mdit: {
    component: "AdminMditCampaignsTab",
    resource: "mdit-campaigns",
    row: {
      id: id(6),
      year: 2026,
      label: "Campagne fictive dette IT",
      isActive: true,
    },
  },
  quality: {
    component: "AdminQualityCampaignsTab",
    resource: "quality-campaigns",
    row: {
      id: id(7),
      name: "Campagne fictive qualité",
      sponsorEmails: ["premier@example.invalid", "second@example.invalid"],
      message: "Message fictif.",
      startDate: "2026-10-10T00:00:00Z",
      endDate: "2026-11-12T00:00:00Z",
      status: "scheduled",
      targetCount: 2,
      averageIqAtStart: 50,
      averageIqCurrent: 60,
    },
  },
  tokens: {
    component: "AdminTokensTab",
    resource: "tokens",
    row: {
      id: id(8),
      kind: "service",
      serviceMode: "delegated",
      name: "Service fictif",
      description: "Description fictive",
      role: "VISITOR",
      status: "active",
      createdAt: "2026-10-01T00:00:00Z",
      expiresAt: "2027-01-01",
      createdBy: { id: "user-synthetic-001", email: "admin@example.invalid" },
      scopeOrganization: null,
    },
  },
  correlations: {
    component: "AdminCorrelationsTab",
    resource: "correlation-suggestions",
    row: {
      id: id(9),
      applicationSourceId: alpha,
      applicationTargetId: beta,
      sourceApplication: { id: alpha, label: "Application fictive Alpha" },
      targetApplication: { id: beta, label: "Application fictive Bêta" },
      score: 0.75,
      signals: { nameSimilarity: 0.9, sharedDataCount: 2, sharedActorCount: 1 },
      status: "PENDING",
      createdAt: "2026-10-01T00:00:00Z",
      reviewedById: null,
      reviewedAt: null,
    },
  },
};
export type AdminScene = keyof typeof adminScenes;

export async function adminNetwork(page: Page) {
  const base = await simulatedNetwork(page);
  const data = new Map<string, Record<string, unknown>[]>(
    Object.values(adminScenes).map((s) => [
      s.resource,
      [structuredClone(s.row)],
    ]),
  );
  const maia = [{ id: id(10), organizationId: id(1), maiaRef: "ORG/FAKE/QA" }];
  const calls: {
    method: string;
    pathname: string;
    query: string;
    status?: number;
    outcome: string;
    body?: unknown;
  }[] = [];
  const pending: {
    pathname: string;
    method: string;
    body: Record<string, unknown>;
    resolve(outcome: "error" | "success"): void;
  }[] = [];
  const state = { scopedAdmin: false, holdReads: false, empty: false };
  await page.context().route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      method = request.method();
    if (url.origin !== new URL(base.base).origin) return route.fallback();
    if (url.pathname === "/api/v2/users/me" && method === "GET") {
      await route.fulfill({
        json: {
          id: "user-synthetic-001",
          email: "admin@example.invalid",
          role: "ADMIN",
          permissions: [
            "AdminPanelManage",
            "GlobalAdminManage",
            "QualityCampaignManage",
          ],
          additionalPermissions: [],
          followedApplications: [],
          emailNotificationsEnabled: false,
          gristDocIds: [],
          gristUrl: "",
          hasGristApiKey: false,
        },
      });
      return;
    }
    const resource = Object.values(adminScenes).find(
      (s) =>
        url.pathname === `/api/v2/${s.resource}` ||
        url.pathname === `/api/v2/${s.resource}/${s.row.id}` ||
        (s.resource === "organizations" &&
          url.pathname === `/api/v2/organizations/${s.row.id}/scoped-admins`) ||
        (s.resource === "quality-campaigns" &&
          ["status", "send-sponsor-report"].some(
            (suffix) =>
              url.pathname ===
              `/api/v2/quality-campaigns/${s.row.id}/${suffix}`,
          )) ||
        (s.resource === "correlation-suggestions" &&
          ["run", `${s.row.id}/accept`, `${s.row.id}/reject`].some(
            (suffix) =>
              url.pathname === `/api/v2/correlation-suggestions/${suffix}`,
          )),
    )?.resource;
    const isMaia =
      url.pathname === "/api/v2/organization-maia-references" ||
      url.pathname === `/api/v2/organization-maia-references/${id(10)}`;
    if (!resource && !isMaia) return route.fallback();
    const record = {
      method,
      pathname: url.pathname,
      query: url.search,
      status: undefined as number | undefined,
      outcome: method === "GET" ? "synthetic-read" : "pending-intercepted",
      body: undefined as unknown,
    };
    calls.push(record);
    if (method === "GET") {
      let body: unknown;
      if (url.pathname.endsWith("/scoped-admins"))
        body = state.scopedAdmin
          ? [{ id: "scoped-admin-qa", email: "scoped@example.invalid" }]
          : [];
      else if (isMaia) body = { results: maia, total: maia.length };
      else if (resource === "tokens") {
        const row = data.get("tokens")?.[0];
        const rows = row
          ? url.searchParams.get("kind") === "personal"
            ? [
                {
                  ...row,
                  id: id(11),
                  kind: "personal",
                  name: "Token personnel fictif",
                  userImpersonate: {
                    id: "user-fictitious",
                    email: "user@example.invalid",
                  },
                },
              ]
            : [row]
          : [];
        body = {
          results: state.empty ? [] : rows,
          total: state.empty ? 0 : rows.length,
        };
      } else {
        const rows = data.get(resource ?? "") ?? [];
        body =
          url.pathname === `/api/v2/${resource}`
            ? {
                results: state.empty ? [] : rows,
                total: state.empty ? 0 : rows.length,
              }
            : rows[0];
      }
      if (state.holdReads) await page.waitForTimeout(500);
      record.status = 200;
      await route.fulfill({ json: body });
      return;
    }
    const rootPath = `/api/v2/${resource}`;
    const selected = Object.values(adminScenes).find(
      (scene) => scene.resource === resource,
    );
    const selectedRowPath = selected ? `${rootPath}/${selected.row.id}` : "";
    const permitted =
      (method === "POST" &&
        (url.pathname === rootPath ||
          (resource === "quality-campaigns" &&
            url.pathname === `${selectedRowPath}/send-sponsor-report`) ||
          (resource === "correlation-suggestions" &&
            [
              `${rootPath}/run`,
              `${selectedRowPath}/accept`,
              `${selectedRowPath}/reject`,
            ].includes(url.pathname)) ||
          (isMaia &&
            url.pathname === "/api/v2/organization-maia-references"))) ||
      (method === "PATCH" &&
        (url.pathname === selectedRowPath ||
          (resource === "quality-campaigns" &&
            url.pathname === `${selectedRowPath}/status`))) ||
      (method === "DELETE" &&
        (url.pathname === selectedRowPath ||
          (resource === "tokens" &&
            url.pathname === `/api/v2/tokens/${id(11)}`) ||
          (isMaia &&
            url.pathname ===
              `/api/v2/organization-maia-references/${id(10)}`)));
    if (!permitted) {
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
      pending.push({ pathname: url.pathname, method, body, resolve }),
    );
    record.outcome = outcome;
    record.status = outcome === "error" ? 500 : 200;
    if (outcome === "error") {
      await route.fulfill({
        status: 500,
        json: { message: "Erreur U14 fictive", error: "Synthetic failure" },
      });
      return;
    }
    let response: unknown = {};
    if (isMaia) {
      if (method === "DELETE") maia.splice(0);
      else
        maia.push({
          id: id(10),
          organizationId: id(1),
          maiaRef: String(body.maiaRef ?? "ORG/FAKE/QA2"),
        });
      response = maia[0] ?? {};
    } else if (
      resource === "correlation-suggestions" &&
      url.pathname.endsWith("/run")
    )
      response = { createdCount: 1, updatedCount: 0 };
    else if (resource === "correlation-suggestions") {
      response = {
        ...data.get(resource)?.[0],
        status: url.pathname.endsWith("/accept") ? "ACCEPTED" : "REJECTED",
      };
      data.set(resource, []);
    } else if (url.pathname.endsWith("/send-sponsor-report"))
      response = { sent: true };
    else if (method === "DELETE") {
      data.set(resource ?? "", []);
      response = {};
    } else {
      const previous = data.get(resource ?? "")?.[0] ?? {};
      const updated = { ...previous, ...body };
      data.set(resource ?? "", [updated]);
      response =
        resource === "tokens"
          ? { ...updated, password: "synthetic-token-not-a-real-secret" }
          : updated;
    }
    await route.fulfill({ status: 200, json: response });
  });
  return {
    ...base,
    adminCalls: calls,
    pending,
    state,
    release(outcome: "error" | "success") {
      const request = pending.shift();
      if (!request) throw new Error("No intercepted admin mutation pending.");
      request.resolve(outcome);
    },
    cancelPending() {
      for (const request of pending.splice(0)) request.resolve("error");
    },
  };
}

export async function mountAdminScene(page: Page, scene: AdminScene) {
  await mountProductionScene(
    page,
    `/src/components/admin/${adminScenes[scene].component}.vue`,
  );
  await page.evaluate(async () => {
    const main = await (await fetch("/src/main.ts")).text();
    const specifiers = [...main.matchAll(/from\s+["']([^"']+)["']/g)].map(
      (match) => match[1],
    );
    const vuePath = specifiers.find((s) => s.includes("/vue.js"));
    if (!vuePath) throw new Error("Real Vue unavailable.");
    const vue = (await import(vuePath)) as {
      createApp(component: unknown): { mount(element: HTMLElement): unknown };
      h(component: unknown, props: Record<string, unknown>): unknown;
    };
    const storePath = "/src/stores/toasterStore.ts";
    const stores = (await import(storePath)) as {
      useToasterStore(): {
        messages: unknown[];
        removeMessage(id: string): void;
      };
    };
    const componentPath = "/src/components/AppToaster.vue";
    const component = (await import(componentPath)) as {
      default: unknown;
    };
    const store = stores.useToasterStore(),
      host = document.createElement("div");
    host.id = "at-admin-real-toaster";
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
  });
  await expect(page.locator("#at-live-scene")).toBeVisible();
}

export async function finishAdmin(
  page: Page,
  network: Awaited<ReturnType<typeof adminNetwork>>,
  info: TestInfo,
) {
  await info.attach("synthetic-admin-network", {
    body: Buffer.from(
      JSON.stringify(
        {
          calls: network.adminCalls,
          unhandled: network.unhandled,
          realBusinessWrites: false,
        },
        null,
        2,
      ),
    ),
    contentType: "application/json",
  });
  await page.screenshot({ path: info.outputPath("admin.png"), fullPage: true });
}
