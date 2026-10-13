import { expect, type Page, type TestInfo } from "@playwright/test";
import { alpha } from "./interactive-utils.js";
import { sharedNetwork } from "./shared-interactive-utils.js";

export const operationIds = {
  metadata: "66666666-6666-4666-8666-666666666666",
  user: "77777777-7777-4777-8777-777777777777",
};
const permissions = [
  "AdminPanelManage",
  "GlobalAdminManage",
  "DeleteApplication",
  "AppRead",
  "ActorRead",
  "ComplianceRead",
  "HostingRead",
  "RelationRead",
  "LinkRead",
  "MetadataRead",
  "DataRead",
  "TechnologyRead",
  "ReportRead",
  "ReportPost",
  "ReportManage",
];
const app = {
  id: alpha,
  label: "Application fictive Alpha",
  shortName: "ALPHA-TEST",
  description: "Fiche entièrement synthétique",
  purposes: [],
  targetPopulations: [],
  tags: [],
  labels: [],
  businessDivisions: [],
  priorityRestart: "R2",
  quality: null,
  currentStatus: {
    status: "in_production",
    statusDate: "2026-01-01T00:00:00.000Z",
  },
};
const targetUser = {
  id: operationIds.user,
  email: "historique@example.invalid",
  role: "READER",
  permissions: [],
  additionalPermissions: [],
  isBlocked: false,
  organization: null,
  scopeOrganization: null,
  organizationId: null,
  scopeOrganizationId: null,
  lastPermissionChangeAt: "2026-10-01T09:00:00.000Z",
  lastPermissionChangedByEmail: "support@example.invalid",
};
const metadata = {
  id: operationIds.metadata,
  applicationId: alpha,
  application: { id: alpha, label: app.label },
  createdBy: {
    id: operationIds.user,
    email: targetUser.email,
    organization: null,
  },
  impersonator: null,
  action: "update",
  description:
    'Modification fictive\nNouvelle(s) valeur(s): {"label":"Application fictive Alpha"}',
  createdAt: "2026-10-01T10:00:00.000Z",
};
export const importReport = {
  summary: {
    created: 1,
    updated: 1,
    errors: 1,
    processedSheets: ["Applications", "Acteurs"],
    ignoredSheets: ["Ancien onglet"],
  },
  entries: [
    {
      sheet: "Applications",
      row: 2,
      status: "created",
      identifier: "app-fictive",
    },
    {
      sheet: "Acteurs",
      row: 3,
      status: "updated",
      identifier: "acteur-fictif",
    },
    {
      sheet: "Acteurs",
      row: 4,
      status: "error",
      message: "Erreur de ligne entièrement simulée",
    },
  ],
  logs: [
    "Début de l’import simulé",
    "Onglets traités : Applications, Acteurs",
    "Une ligne incorrecte ; aucune écriture réelle",
  ],
};

export async function operationsNetwork(page: Page) {
  const base = await sharedNetwork(page);
  const state = {
    deletion: "error" as "error" | "success",
    import: "error" as "error" | "success",
    metadata: "results" as "results" | "empty" | "error",
    actionLogs: "results" as "results" | "empty" | "error",
    emailLogs: "results" as "results" | "empty" | "error",
    userHistory: "results" as "results" | "empty" | "error",
    matrixHistory: "results" as "results" | "empty" | "error",
    mutationDelayMs: 900,
  };
  const calls: {
    method: string;
    pathname: string;
    query: string;
    status: number;
    body?: unknown;
  }[] = [];
  const origin = new URL(base.base).origin;
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
    const jsonRequest = request
      .headers()
      ["content-type"]?.includes("application/json");
    const body: unknown = ["POST", "PATCH"].includes(method)
      ? jsonRequest
        ? request.postDataJSON()
        : {
            contentType: request.headers()["content-type"],
            byteLength: request.postDataBuffer()?.byteLength ?? 0,
          }
      : undefined;
    if (method === "GET" && url.pathname === "/api/v2/users/me")
      data = {
        id: "user-synthetic-001",
        email: "nvda@example.invalid",
        role: "ADMIN",
        permissions,
        additionalPermissions: [],
        followedApplications: [],
        emailNotificationsEnabled: false,
      };
    else if (method === "GET" && url.pathname === "/api/v2/users")
      data = { results: [targetUser], total: 1 };
    else if (
      method === "GET" &&
      url.pathname === `/api/v2/applications/${alpha}`
    )
      data = app;
    else if (
      method === "GET" &&
      url.pathname === `/api/v2/applications/${alpha}/my-perms`
    )
      data = permissions;
    else if (
      method === "GET" &&
      url.pathname === `/api/v2/applications/${alpha}/metadatas/first-last`
    )
      data = { first: null, last: null };
    else if (
      method === "GET" &&
      url.pathname === `/api/v2/applications/${alpha}/reports`
    )
      data = { results: [], total: 0 };
    else if (
      method === "DELETE" &&
      url.pathname === `/api/v2/applications/${alpha}`
    ) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      status = state.deletion === "error" ? 500 : 204;
      data = { message: "Suppression refusée entièrement simulée" };
    } else if (method === "POST" && url.pathname === "/api/v2/import/excel") {
      await new Promise((resolve) =>
        setTimeout(resolve, state.mutationDelayMs),
      );
      if (state.import === "error") {
        status = 500;
        data = { message: "Import entièrement simulé refusé" };
      } else data = importReport;
    } else if (
      ["POST", "GET"].includes(method) &&
      [
        "/api/v2/users/sync-organizations-from-maia",
        "/api/v2/actors/sync-maia",
        "/api/v2/applications/data-quality/update",
      ].includes(url.pathname)
    ) {
      await new Promise((resolve) =>
        setTimeout(resolve, state.mutationDelayMs),
      );
      status = 500;
      data = { message: "Traitement entièrement simulé refusé" };
    } else if (method === "GET" && url.pathname === "/api/v2/metadatas") {
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (state.metadata === "error") {
        status = 500;
        data = { message: "Historique indisponible fictivement" };
      } else
        data = {
          results: state.metadata === "empty" ? [] : [metadata],
          total: state.metadata === "empty" ? 0 : 1,
        };
    } else if (
      method === "GET" &&
      url.pathname === `/api/v2/metadatas/${operationIds.metadata}`
    )
      data = metadata;
    else if (method === "GET" && url.pathname === "/api/v2/action-logs") {
      await new Promise((resolve) => setTimeout(resolve, 700));
      if (state.actionLogs === "error") {
        status = 500;
        data = { message: "Journal des actions fictivement indisponible" };
      } else
        data = {
          results:
            state.actionLogs === "empty"
              ? []
              : [
                  {
                    id: "action-at",
                    createdAt: "2026-10-01T10:00:00.000Z",
                    method: "PATCH",
                    path: "/api/v2/fictive",
                    statusCode: 200,
                    user: { id: operationIds.user, email: targetUser.email },
                    impersonator: null,
                  },
                ],
          total: state.actionLogs === "empty" ? 0 : 1,
        };
    } else if (method === "GET" && url.pathname === "/api/v2/email/logs") {
      await new Promise((resolve) => setTimeout(resolve, 700));
      if (state.emailLogs === "error") {
        status = 500;
        data = { message: "E-mails fictivement indisponibles" };
      } else
        data = {
          results:
            state.emailLogs === "empty"
              ? []
              : [
                  {
                    id: "email-at",
                    sentAt: "2026-10-01T10:00:00.000Z",
                    to: targetUser.email,
                    subject: "Message entièrement fictif",
                    wasSent: true,
                    text: "Contenu fictif en texte",
                    html: "<!doctype html><html lang='fr'><head><title>Message fictif</title></head><body><h1>Message fictif</h1><p>Contenu local sans lien externe.</p></body></html>",
                  },
                ],
          total: state.emailLogs === "empty" ? 0 : 1,
        };
    } else if (
      method === "GET" &&
      url.pathname === `/api/v2/users/${operationIds.user}/permission-logs`
    ) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      if (state.userHistory === "error") {
        status = 500;
        data = { message: "Historique personnel fictivement indisponible" };
      } else
        data =
          state.userHistory === "empty"
            ? []
            : [
                {
                  id: "permission-at",
                  createdAt: "2026-10-01T10:00:00.000Z",
                  role: "READER",
                  additionalPermissions: [],
                  changedByEmail: "support@example.invalid",
                  impersonatorEmail: null,
                },
              ];
    } else if (
      method === "GET" &&
      url.pathname === `/api/v2/users/${operationIds.user}/connexion-logs`
    ) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      if (state.userHistory === "error") {
        status = 500;
        data = { message: "Historique de connexion fictivement indisponible" };
      } else
        data =
          state.userHistory === "empty"
            ? []
            : [
                {
                  id: "connexion-at",
                  authTime: "2026-10-01T10:00:00.000Z",
                  authLevel: "strong",
                  authMethod: "MFA fictive",
                  authIdp: "Fournisseur fictif",
                  authSource: "token",
                },
              ];
    } else if (
      method === "GET" &&
      url.pathname === "/api/v2/actorTypes/perms-matrix"
    )
      data = [];
    else if (
      method === "GET" &&
      url.pathname === "/api/v2/actorTypes/perms-matrix/history"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      if (state.matrixHistory === "error") {
        status = 500;
        data = { message: "Historique matrice fictivement indisponible" };
      } else
        data =
          state.matrixHistory === "empty"
            ? []
            : [
                {
                  id: "matrix-at",
                  createdAt: "2026-10-01T10:00:00.000Z",
                  description: "Permission fictive modifiée",
                  changedByEmail: "support@example.invalid",
                },
              ];
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
  // Isolated browser session only. The real UserManager consumes this fixture;
  // no login/provider, account, permission or business data is changed.
  await page.addInitScript(
    ({ authority, clientId }) => {
      if (window !== window.top) return;
      sessionStorage.setItem(
        `oidc.user:${authority}:${clientId}`,
        JSON.stringify({
          id_token: "synthetic-id-token-no-credentials",
          access_token: "synthetic-access-token-no-credentials",
          token_type: "Bearer",
          scope: "openid profile email",
          expires_at: Math.floor(Date.now() / 1000) + 7200,
          profile: {
            iss: authority,
            sub: "user-synthetic-001",
            sid: "session-synthetic-operations",
            email: "nvda@example.invalid",
            name: "Utilisateur fictif",
          },
        }),
      );
    },
    { authority: `${origin}/at-oidc`, clientId: "at-synthetic-client" },
  );
  return { ...base, operationsState: state, operationsCalls: calls };
}

export async function finishOperations(
  page: Page,
  network: Awaited<ReturnType<typeof operationsNetwork>>,
  info: TestInfo,
) {
  const calls = [
    ...network.calls,
    ...network.extraCalls,
    ...network.operationsCalls,
  ];
  await info.attach("operations-network-simulated-only", {
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
  await page.screenshot({
    path: info.outputPath("operations-scene-final.png"),
    fullPage: true,
  });
}
