import { expect, type Page, type TestInfo } from "@playwright/test";
import {
  alpha,
  mountProductionScene,
  simulatedNetwork,
} from "./interactive-utils.js";

export const appFixtureIds = {
  actor: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  actorType: "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  data: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  description: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  family: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  report: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
};
const organization = {
  id: "org-synthetic-001",
  label: "Organisation synthétique",
  path: "Test/Organisation synthétique",
  parentId: null,
};
const actorTypes = [
  {
    id: appFixtureIds.actorType,
    code: "MOA",
    label: "Maîtrise d'Ouvrage fictive",
    description: "Type de test",
  },
];
const actor = {
  id: appFixtureIds.actor,
  applicationId: alpha,
  actorTypeId: appFixtureIds.actorType,
  email: "acteur@example.invalid",
  firstname: "Prénom fictif",
  lastname: "Nom fictif",
  organizationId: organization.id,
  isGroup: false,
};
const description = {
  id: appFixtureIds.description,
  name: "Donnée fictive",
  description: "Description fictive",
  officialUrl: "",
  families: [{ id: appFixtureIds.family, path: "Test/Famille fictive" }],
  tags: [],
  applicationsSource: [],
  dataApplications: [],
};
const applicationData = {
  id: appFixtureIds.data,
  applicationId: alpha,
  dataDescriptionId: appFixtureIds.description,
  dataDescription: description,
  exposures: [],
  documentationUrl: [],
  isReference: false,
  businessUsage: "Usage fictif",
  example: "Exemple fictif",
  conservation: "Durée fictive",
};
const report = {
  id: appFixtureIds.report,
  applicationId: null,
  application: null,
  description: "Signalement entièrement fictif",
  notes: "Note initiale fictive",
  status: "in_pending",
  notifier: { id: "user-synthetic-001", email: "nvda@example.invalid" },
  impersonator: null,
  createdAt: "2026-10-13T08:00:00.000Z",
  updatedAt: "2026-10-13T08:00:00.000Z",
};

export async function simulatedApplicationNetwork(page: Page) {
  const base = await simulatedNetwork(page);
  const state = {
    reportMode: "error" as "error" | "success",
    reports: [{ ...report }],
    familyMode: "error" as "error" | "success",
    dataMode: "error" as "error" | "success",
    exposureMode: "error" as "error" | "success",
    actorMode: "error" as "error" | "success",
  };
  const calls: {
    method: string;
    pathname: string;
    status: number;
    body?: unknown;
  }[] = [];
  await page.context().route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      method = request.method();
    if (url.origin !== new URL(base.base).origin) {
      await route.fallback();
      return;
    }
    let data: unknown,
      status = 200;
    const body: unknown = ["POST", "PATCH"].includes(method)
      ? request.postDataJSON()
      : undefined;
    if (method === "GET" && url.pathname === "/api/v2/users/me")
      data = {
        id: "user-synthetic-001",
        email: "nvda@example.invalid",
        role: "ADMIN",
        permissions: [
          "AdminPanelManage",
          "ActorWrite",
          "TechnologyWrite",
          "DataWrite",
          "ReportRead",
          "ReportPost",
          "ReportManage",
        ],
        additionalPermissions: [],
        followedApplications: [],
        emailNotificationsEnabled: false,
      };
    else if (method === "GET" && url.pathname === "/api/v2/actorTypes")
      data = { results: actorTypes, total: actorTypes.length };
    else if (
      method === "GET" &&
      url.pathname === `/api/v2/applications/${alpha}/actors`
    )
      data = { results: [actor], total: 1 };
    else if (
      method === "GET" &&
      url.pathname === `/api/v2/organizations/${organization.id}`
    )
      data = organization;
    else if (
      ["POST", "PATCH"].includes(method) &&
      (url.pathname === `/api/v2/applications/${alpha}/actors` ||
        url.pathname === `/api/v2/applications/${alpha}/actors/${actor.id}`)
    ) {
      await new Promise((resolve) => setTimeout(resolve, 650));
      if (state.actorMode === "error") {
        status = 500;
        data = { message: "Erreur d’acteur entièrement simulée" };
      } else
        data = { ...actor, ...(body && typeof body === "object" ? body : {}) };
    } else if (
      method === "GET" &&
      url.pathname === `/api/v2/applications/${alpha}/technologies`
    )
      data = [];
    else if (
      method === "GET" &&
      url.pathname === `/api/v2/applications/${alpha}/technologies/eol-products`
    )
      data = [{ name: "postgresql", label: "PostgreSQL", aliases: [] }];
    else if (
      method === "POST" &&
      url.pathname === `/api/v2/applications/${alpha}/technologies`
    ) {
      await new Promise((resolve) => setTimeout(resolve, 650));
      status = 500;
      data = { message: "Erreur de technologie entièrement simulée" };
    } else if (
      method === "GET" &&
      url.pathname === `/api/v2/applications/${alpha}/my-perms`
    )
      data = ["DataWrite", "DataRead"];
    else if (
      method === "GET" &&
      url.pathname === `/api/v2/data-catalog/applications/${alpha}`
    )
      data = { results: [], total: 0 };
    else if (
      method === "GET" &&
      url.pathname ===
        `/api/v2/data-catalog/applications/${alpha}/${applicationData.id}`
    )
      data = applicationData;
    else if (
      method === "GET" &&
      url.pathname === "/api/v2/data-catalog/descriptions"
    )
      data = [description];
    else if (
      method === "GET" &&
      url.pathname === "/api/v2/data-catalog/families"
    )
      data = { results: description.families, total: 1 };
    else if (
      method === "GET" &&
      url.pathname === "/api/v2/data-catalog/sensibilities"
    )
      data = {
        results: [
          {
            id: "sensibility-synthetic-001",
            label: "Sensibilité fictive",
            color: null,
          },
        ],
        total: 1,
      };
    else if (
      method === "POST" &&
      url.pathname === "/api/v2/data-catalog/families"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 650));
      if (state.familyMode === "error") {
        status = 500;
        data = { message: "Erreur de famille entièrement simulée" };
      } else {
        status = 201;
        data = {
          id: "family-synthetic-created",
          path: "Test/Famille créée fictivement",
        };
      }
    } else if (
      ["POST", "PATCH"].includes(method) &&
      [
        "/api/v2/data-catalog/descriptions",
        `/api/v2/data-catalog/descriptions/${description.id}`,
      ].includes(url.pathname)
    )
      data = {
        ...description,
        ...(body && typeof body === "object" ? body : {}),
      };
    else if (
      ["POST", "PATCH"].includes(method) &&
      [
        `/api/v2/data-catalog/applications/${alpha}`,
        `/api/v2/data-catalog/applications/${alpha}/${applicationData.id}`,
      ].includes(url.pathname)
    ) {
      await new Promise((resolve) => setTimeout(resolve, 650));
      if (state.dataMode === "error") {
        status = 500;
        data = { message: "Erreur de donnée entièrement simulée" };
      } else data = applicationData;
    } else if (
      ["POST", "PATCH"].includes(method) &&
      url.pathname ===
        `/api/v2/data-catalog/applications/${alpha}/${applicationData.id}/exposures`
    ) {
      await new Promise((resolve) => setTimeout(resolve, 650));
      if (state.exposureMode === "error") {
        status = 500;
        data = { message: "Erreur d’exposition entièrement simulée" };
      } else {
        status = 201;
        data = {
          id: "exposure-synthetic-created",
          ...(body && typeof body === "object" ? body : {}),
        };
      }
    } else if (method === "GET" && url.pathname === "/api/v2/reports")
      data = { results: state.reports, total: state.reports.length };
    else if (
      method === "PATCH" &&
      url.pathname === `/api/v2/reports/${report.id}`
    ) {
      await new Promise((resolve) => setTimeout(resolve, 650));
      if (state.reportMode === "error") {
        status = 500;
        data = { message: "Erreur de signalement entièrement simulée" };
      } else {
        const saved = {
          ...report,
          ...(body && typeof body === "object" ? body : {}),
        };
        state.reports = [saved];
        data = saved;
      }
    } else {
      await route.fallback();
      return;
    }
    calls.push({ method, pathname: url.pathname, status, body });
    await route.fulfill({ status, json: data });
  });
  return { ...base, applicationState: state, applicationCalls: calls };
}

export async function mountApplicationScene(
  page: Page,
  scene: "actors-technologies" | "data" | "reports",
) {
  const components =
    scene === "actors-technologies"
      ? [
          "/src/components/actor/ActorTab.vue",
          "/src/components/technology/TechnologyTab.vue",
        ]
      : scene === "data"
        ? [
            "/src/components/data-application/DataApplicationTab.vue",
            "/src/components/data-application/DataApplicationDetail.vue",
          ]
        : ["/src/components/Report/ReportsTab.vue"];
  const host = await page.evaluate(
    async ({ components, scene, ids }) => {
      const main = await (await fetch("/src/main.ts")).text();
      const paths = [...main.matchAll(/from\s+["']([^"']+)["']/g)].map(
        (match) => match[1],
      );
      const vue = paths.find((value) => value.includes("/vue.js"));
      if (!vue) throw new Error("Dépendance Vue réelle absente");
      const imports = components
        .map(
          (path, index) =>
            `import C${index} from ${JSON.stringify(new URL(path, location.origin).href)};`,
        )
        .join("\n");
      const children =
        scene === "reports"
          ? "h(C0,{isActive:true,allReport:true})"
          : scene === "data"
            ? `h(C0,{application}),h(C1,{applicationId:application.id,dataApplicationId:${JSON.stringify(ids.data)}})`
            : "h(C0,{application}),h(C1,{application})";
      const content = `import {h} from ${JSON.stringify(new URL(vue, location.origin).href)};\n${imports}\nimport AppToaster from ${JSON.stringify(new URL("/src/components/AppToaster.vue", location.origin).href)};\nimport {useToasterStore} from ${JSON.stringify(new URL("/src/stores/toasterStore.ts", location.origin).href)};\nexport default {props:{application:Object},setup(props){const toaster=useToasterStore();const application={...props.application,myPerms:new Set(props.application.myPerms)};return()=>h('section',{'data-testid':'application-native-synthetic-host'},[h('h1',null,${JSON.stringify(scene + " — scène synthétique")}),${children},h(AppToaster,{messages:toaster.messages,onCloseMessage:(id)=>toaster.removeMessage(id)})]);}}`;
      return {
        url: URL.createObjectURL(
          new Blob([content], { type: "text/javascript" }),
        ),
        content,
      };
    },
    { components, scene, ids: appFixtureIds },
  );
  await mountProductionScene(page, host.url, {
    application: {
      id: alpha,
      label: "Application fictive Alpha",
      myPerms: ["ActorWrite", "TechnologyWrite", "DataRead", "DataWrite"],
    },
  });
  await page.evaluate((scene) => {
    document.title = `RefApp — ${scene} synthétique NVDA`;
  }, scene);
  return { components, hostSource: host.content };
}

export async function finishApplicationScene(
  page: Page,
  network: Awaited<ReturnType<typeof simulatedApplicationNetwork>>,
  info: TestInfo,
) {
  await info.attach("application-network-synthetic-only", {
    body: Buffer.from(
      JSON.stringify(
        {
          baseCalls: network.calls,
          calls: network.applicationCalls,
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
    path: info.outputPath("application-scene-final.png"),
    fullPage: true,
  });
}
