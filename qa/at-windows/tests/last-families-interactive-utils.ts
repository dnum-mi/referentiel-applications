import { expect, type Page, type TestInfo } from "@playwright/test";
import { alpha, mountProductionScene } from "./interactive-utils.js";
import { operationsNetwork } from "./operations-interactive-utils.js";
import { mountSharedScene } from "./shared-interactive-utils.js";

export const tooltipName = "Afficher l’aide sur le rattachement des acteurs";
export const tooltipDescription =
  "Établir le lien entre une personne physique et une boîte e-mail fonctionnelle";
export const technologyId = "aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa";
export const helpVariants = [
  {
    id: "business-division",
    component: "/src/components/business-division/BusinessDivisionSearch.vue",
    props: {
      label: "Direction métier",
      tooltipContent:
        "Recherche les applications rattachées à au moins une des directions de métier sélectionnées.",
    },
    name: "Afficher l’aide sur Direction métier",
    description:
      "Recherche les applications rattachées à au moins une des directions de métier sélectionnées.",
  },
  {
    id: "tags",
    component: "/src/components/common/TagSearchSelect.vue",
    props: {
      tooltipContent:
        "Recherche les applications associées à un ou plusieurs tags sélectionnés.",
    },
    name: "Afficher l’aide sur le filtre Tags",
    description:
      "Recherche les applications associées à un ou plusieurs tags sélectionnés.",
  },
  {
    id: "reference-application",
    component: "/src/components/search/RelationFilter.vue",
    props: {},
    name: "Afficher l’aide sur Rechercher une application",
    description:
      "Sélectionne l’application de référence utilisée pour filtrer les relations ci-dessous (fait partie de, remplace, utilise le service de…).",
  },
];
const organization = {
  id: "org-synthetic-001",
  label: "Organisation fictive Nord",
  path: "Test/Nord",
};
const actor = {
  id: "actor-last-synthetic",
  applicationId: alpha,
  actorTypeId: "actor-type-last",
  email: "acteur@example.invalid",
  firstname: "Prénom fictif",
  lastname: "Nom fictif",
  organizationId: organization.id,
  isGroup: false,
  application: { id: alpha, label: "Application fictive Alpha" },
};
const technology = {
  id: technologyId,
  applicationId: alpha,
  technology: "Base de données fictive",
  product: "PostgreSQL",
  version: "13",
  docUrl: null,
  eolProduct: null,
  eolCycle: null,
  eolDate: "2024-11-01T00:00:00.000Z",
  eoasDate: null,
  eolStatus: "eol",
  eolSource: "manual",
  eolCheckedAt: "2026-10-01T00:00:00.000Z",
  latestVersion: "13.23",
};
const applications = Array.from({ length: 18 }, (_, index) => ({
  id:
    index === 0
      ? alpha
      : "55555555-2222-4222-8222-" + String(index + 1).padStart(12, "0"),
  label:
    index === 0
      ? "Application fictive Alpha"
      : "Application fictive Bêta " + String(index + 1).padStart(2, "0"),
  shortName: "AT-EOL-" + (index + 1),
  organizationPaths: [index < 9 ? "Test/Nord" : "Test/Sud"],
  worstStatus:
    index % 3 === 0 ? "eol" : index % 3 === 1 ? "eol-soon" : "eoas-passed",
  technologies: [
    {
      id: "technology-eol-" + index,
      product: index === 0 ? "PostgreSQL" : "Produit fictif " + (index + 1),
      version: "13",
      status:
        index % 3 === 0 ? "eol" : index % 3 === 1 ? "eol-soon" : "eoas-passed",
      eolDate: "2024-11-01T00:00:00.000Z",
      eoasDate: "2024-01-01T00:00:00.000Z",
      eolSource: index === 0 ? "manual" : "endoflife.date",
      latestVersion: "13.23",
    },
  ],
}));
const permissions = [
  "AdminPanelManage",
  "GlobalAdminManage",
  "TechnologyList",
  "ActorRead",
  "ActorWrite",
  "TechnologyRead",
  "TechnologyWrite",
  "AppRead",
  "LinkRead",
  "ReportRead",
  "ReportPost",
  "ReportManage",
];

export async function lastFamiliesNetwork(page: Page) {
  const base = await operationsNetwork(page);
  const origin = new URL(base.base).origin;
  const state = {
    me: "strong" as "strong" | "weak" | "blocked",
    discovery: "error" as "error" | "ok",
    eolError: false,
    renewalCount: 0,
  };
  const calls: {
    method: string;
    pathname: string;
    query: string;
    status: number;
    body?: string;
  }[] = [];
  const user = {
    id: "user-synthetic-001",
    email: "nvda@example.invalid",
    role: "ADMIN",
    permissions,
    additionalPermissions: [],
    followedApplications: [],
    emailNotificationsEnabled: false,
    gristUrl: "",
    hasGristApiKey: false,
    gristDocIds: [],
    authLevel: { level: "strong", reason: "strong-method", downgraded: false },
  };
  await page.context().route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    if (url.origin !== origin) {
      await route.fallback();
      return;
    }
    let data: unknown;
    let status = 200;
    if (method === "GET" && url.pathname === "/api/v2/config")
      data = {
        oidcConfigUrl: origin + "/at-oidc/.well-known/openid-configuration",
        oidcClientId: "at-synthetic-client",
        oidcScope: "openid profile email",
        version: "test-synthetic",
        environmentLabel: "Test synthétique NVDA",
        footerLinks: [],
        authLevel: {
          mode: "enforce",
          helpUrl: origin + "/at-auth-help",
          reauth: { strategy: "prompt", prompt: "login", maxAge: 0 },
        },
      };
    else if (method === "GET" && url.pathname === "/api/v2/users/me") {
      if (state.me === "weak") {
        status = 403;
        data = {
          strongAuthRequired: true,
          authLevel: { level: "weak", reason: "weak-method", downgraded: true },
        };
      } else if (state.me === "blocked") {
        status = 403;
        data = { blocked: true, message: "Accès fictivement bloqué" };
      } else data = user;
    } else if (
      method === "GET" &&
      url.pathname === "/at-oidc/.well-known/openid-configuration"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 650));
      if (state.discovery === "error") {
        status = 503;
        data = { message: "Fournisseur strictement fictif indisponible" };
      } else
        data = {
          issuer: origin + "/at-oidc",
          authorization_endpoint: origin + "/at-oidc/authorize",
          token_endpoint: origin + "/at-oidc/token",
          jwks_uri: origin + "/at-oidc/keys",
          response_types_supported: ["code"],
          subject_types_supported: ["public"],
          id_token_signing_alg_values_supported: ["RS256"],
        };
    } else if (method === "POST" && url.pathname === "/at-oidc/token") {
      const body = new URLSearchParams(request.postData() ?? "");
      if (
        body.get("grant_type") !== "refresh_token" ||
        body.get("refresh_token") !== "synthetic-refresh-no-credentials" ||
        body.get("client_id") !== "at-synthetic-client"
      )
        throw new Error("Unexpected synthetic refresh request");
      await new Promise((resolve) => setTimeout(resolve, 650));
      state.renewalCount++;
      data = {
        access_token: "synthetic-renewed-" + state.renewalCount,
        refresh_token: "synthetic-refresh-no-credentials",
        token_type: "Bearer",
        scope: "openid profile email",
        expires_in: 7200,
      };
    } else if (
      method === "GET" &&
      url.pathname === "/api/v2/technologies/end-of-life"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 650));
      if (state.eolError) {
        status = 500;
        data = { message: "Fins de vie fictivement indisponibles" };
      } else {
        const requestedStatus = url.searchParams.get("status") ?? "";
        const search = (url.searchParams.get("search") ?? "").toLocaleLowerCase(
          "fr",
        );
        const org = (
          url.searchParams.get("organization") ?? ""
        ).toLocaleLowerCase("fr");
        const candidates = applications.filter(
          (app) =>
            (!requestedStatus ||
              requestedStatus === "all" ||
              app.worstStatus === requestedStatus) &&
            (!search || app.label.toLocaleLowerCase("fr").includes(search)) &&
            (!org ||
              app.organizationPaths
                .join(" ")
                .toLocaleLowerCase("fr")
                .includes(org)),
        );
        const ordered = [...candidates].sort(
          (a, b) =>
            a.label.localeCompare(b.label, "fr") *
            (url.searchParams.get("order") === "desc" ? -1 : 1),
        );
        const size = Number(url.searchParams.get("pageSize") ?? 15);
        const start = Number(url.searchParams.get("page") ?? 0) * size;
        data = {
          results: ordered.slice(start, start + size),
          total: ordered.length,
        };
      }
    } else if (method === "GET" && url.pathname === "/api/v2/actors")
      data = { results: [actor], total: 1 };
    else if (method === "GET" && url.pathname === "/api/v2/actorTypes")
      data = {
        results: [
          {
            id: actor.actorTypeId,
            code: "MOA",
            label: "Maîtrise d’ouvrage fictive",
            description: "",
          },
        ],
        total: 1,
      };
    else if (
      method === "GET" &&
      url.pathname === "/api/v2/organizations/" + organization.id
    )
      data = organization;
    else if (
      method === "GET" &&
      url.pathname === "/api/v2/applications/" + alpha + "/actors"
    )
      data = { results: [actor], total: 1 };
    else if (
      method === "GET" &&
      url.pathname === "/api/v2/applications/" + alpha + "/technologies"
    )
      data = [technology];
    else if (
      method === "GET" &&
      url.pathname ===
        "/api/v2/applications/" + alpha + "/technologies/eol-products"
    )
      data = [];
    else if (
      method === "GET" &&
      url.pathname === "/api/v2/applications/" + alpha + "/my-perms"
    )
      data = permissions;
    else if (url.pathname.startsWith("/at-oidc/")) {
      base.unhandled.push({ method, url: url.pathname });
      await route.abort("blockedbyclient");
      return;
    } else {
      await route.fallback();
      return;
    }
    calls.push({
      method,
      pathname: url.pathname,
      query: url.search,
      status,
      body: method === "POST" ? (request.postData() ?? undefined) : undefined,
    });
    await route.fulfill({ status, json: data });
  });
  await page.addInitScript(
    ({ authority, clientId }) => {
      if (window !== window.top) return;
      const key = "oidc.user:" + authority + ":" + clientId;
      const serialized = sessionStorage.getItem(key);
      if (!serialized) throw new Error("Controlled OIDC seed missing");
      const seed: unknown = JSON.parse(serialized);
      if (!seed || typeof seed !== "object")
        throw new Error("Invalid controlled OIDC seed");
      sessionStorage.setItem(
        key,
        JSON.stringify({
          ...seed,
          refresh_token: "synthetic-refresh-no-credentials",
        }),
      );
    },
    { authority: origin + "/at-oidc", clientId: "at-synthetic-client" },
  );
  return { ...base, lastState: state, lastCalls: calls };
}

export async function mountLastApp(page: Page, route: string) {
  await mountSharedScene(page, "search");
  await page.evaluate(async (path) => {
    if (!window.__rgaaShared) throw new Error("Real App router host missing");
    await window.__rgaaShared.navigate(path);
  }, route);
  await expect
    .poll(() => page.evaluate(() => window.__rgaaShared?.path()))
    .toBe(route);
}

export async function mountLastActors(page: Page, admin = true) {
  if (admin)
    await mountProductionScene(
      page,
      "/src/components/admin/AdminActorsTab.vue",
    );
  else await mountLastApp(page, "/applications/" + alpha + "/tab-actors");
  await expect(
    page.getByRole("button", { name: tooltipName, exact: true }),
  ).toBeVisible();
}

export async function mountLastHelp(
  page: Page,
  variant: (typeof helpVariants)[number],
) {
  await mountProductionScene(page, variant.component, variant.props);
  await expect(
    page.getByRole("button", { name: variant.name, exact: true }),
  ).toBeVisible();
}

export async function renewRealOidc(page: Page) {
  return page.evaluate(async () => {
    const path = "/src/services/authentication.ts";
    const auth = (await import(path)) as {
      USER_MANAGER: {
        signinSilent(): Promise<{
          access_token: string;
          profile: { sub?: string; sid?: string };
        }>;
      };
    };
    const user = await auth.USER_MANAGER.signinSilent();
    return {
      tokenIsControlledFixture:
        user.access_token.startsWith("synthetic-renewed-"),
      sub: user.profile.sub,
      sid: user.profile.sid,
    };
  });
}

export async function refreshRealUser(page: Page) {
  await page.evaluate(async () => {
    if (!window.__rgaaAtHost) throw new Error("Real user store host missing");
    await window.__rgaaAtHost.refreshUser();
  });
}

export async function finishLastFamilies(
  page: Page,
  network: Awaited<ReturnType<typeof lastFamiliesNetwork>>,
  info: TestInfo,
) {
  const calls = [
    ...network.calls,
    ...network.extraCalls,
    ...network.operationsCalls,
    ...network.lastCalls,
  ];
  const businessWrites = calls.filter(
    (call) => call.method !== "GET" && call.pathname !== "/at-oidc/token",
  );
  await info.attach("last-families-synthetic-network", {
    body: Buffer.from(
      JSON.stringify(
        {
          calls,
          unhandled: network.unhandled,
          realProviderRequests: 0,
          actualBusinessWrites: 0,
        },
        null,
        2,
      ),
    ),
    contentType: "application/json",
  });
  expect(network.unhandled).toEqual([]);
  expect(businessWrites).toEqual([]);
  await page.screenshot({
    path: info.outputPath("last-families-final.png"),
    fullPage: true,
  });
}
