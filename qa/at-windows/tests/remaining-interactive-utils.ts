import { expect, type Page, type TestInfo } from "@playwright/test";
import {
  alpha,
  mountProductionScene,
  simulatedNetwork,
} from "./interactive-utils.js";

const compliance = {
  id: "compliance-synthetic-001",
  applicationId: alpha,
  dima_duration_hours: 24,
  dima_is_hno: false,
  dima_business_impact: "Impact fictif",
  dima_recovery_plan: true,
  dima_recovery_solutions: "Solution fictive",
  dima_recovery_manager: "Responsable fictif",
  dima_last_test_date: "2026-10-01T00:00:00.000Z",
  dima_test_result: "OK",
  pdma_duration_hours: 24,
  pdma_data_types: "Données fictives",
  pdma_backup_frequency: "Quotidienne",
  pdma_backup_storage: "LOCAL",
  pdma_last_test_date: "2026-10-02T00:00:00.000Z",
  pdma_test_result: "OK",
  pdma_backup_method: "Méthode fictive",
  pdma_restoration_manager: "Responsable fictif",
  homologation_status: "non_realisee",
  homologation_date_end: null,
  dsfr_implemented: true,
  dsfr_version: "1.14",
  rgpd_has_aipd: true,
  rgpd_dpo_name: "DPO fictif",
  eco_index_target_url: "https://example.invalid",
  eco_index_score: 65,
  eco_index_ges: 1,
  eco_index_water: 2,
  eco_index_last_calculated_at: "2026-10-01T00:00:00.000Z",
};
const actorTypes = [
  {
    id: "actor-type-synthetic-moa",
    code: "MOA",
    label: "Maîtrise d'Ouvrage fictive",
    description: "Type de test",
  },
  {
    id: "actor-type-synthetic-moe",
    code: "MOE",
    label: "Maîtrise d'Œuvre fictive",
    description: "Type de test",
  },
];

export async function simulatedRemainingNetwork(page: Page) {
  const base = await simulatedNetwork(page);
  const state = {
    complianceMode: "error" as "error" | "success",
    rgaaMode: "error" as "error" | "success",
  };
  const calls: { method: string; pathname: string; status: number }[] = [];
  const missingDecorativeIcons: string[] = [];
  await page.context().route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      method = request.method();
    if (
      method === "GET" &&
      [
        "https://api.iconify.design",
        "https://api.simplesvg.com",
        "https://api.unisvg.com",
      ].includes(url.origin) &&
      ["/add.json", "/delete.json"].includes(url.pathname) &&
      url.searchParams.get("icons") === "line"
    ) {
      missingDecorativeIcons.push(url.origin + url.pathname);
      await route.fulfill({
        status: 404,
        body: "",
        headers: { "Access-Control-Allow-Origin": "*" },
      });
      return;
    }
    if (url.origin !== new URL(base.base).origin) {
      await route.fallback();
      return;
    }
    let data: unknown,
      status = 200;
    if (method === "GET" && url.pathname === "/api/v2/actorTypes")
      data = { results: actorTypes, total: actorTypes.length };
    else if (method === "POST" && url.pathname === "/api/v2/actorTypes") {
      await new Promise((resolve) => setTimeout(resolve, 600));
      status = 500;
      data = { message: "Création de type entièrement simulée" };
    } else if (
      method === "GET" &&
      url.pathname === `/api/v2/applications/${alpha}/compliances`
    )
      data = compliance;
    else if (
      method === "PATCH" &&
      url.pathname === `/api/v2/applications/${alpha}/compliances`
    ) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (state.complianceMode === "error") {
        status = 500;
        data = { message: "Modification de conformité entièrement simulée" };
      } else {
        const payload: unknown = request.postDataJSON();
        data = {
          ...compliance,
          ...(payload && typeof payload === "object" ? payload : {}),
        };
      }
    } else if (
      method === "GET" &&
      url.pathname === `/api/v2/applications/${alpha}/rgaa-compliances`
    )
      data = [];
    else if (
      method === "POST" &&
      url.pathname === `/api/v2/applications/${alpha}/rgaa-compliances`
    ) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (state.rgaaMode === "error") {
        status = 500;
        data = { message: "Création RGAA entièrement simulée" };
      } else {
        const payload: unknown = request.postDataJSON();
        status = 201;
        data = {
          id: "rgaa-synthetic-001",
          applicationId: alpha,
          ...(payload && typeof payload === "object" ? payload : {}),
        };
      }
    } else if (method === "GET" && url.pathname === "/api/v2/tags")
      data = { results: [], total: 0 };
    else {
      await route.fallback();
      return;
    }
    calls.push({ method, pathname: url.pathname, status });
    await route.fulfill({ status, json: data });
  });
  return {
    ...base,
    remainingState: state,
    remainingCalls: calls,
    missingDecorativeIcons,
  };
}

export const remainingScenes = {
  compliances: {
    path: "/src/components/compliances/CompliancesAccordionManager.vue",
    props: {
      application: {
        id: alpha,
        label: "Application fictive Alpha",
        myPerms: ["ComplianceWrite"],
      },
    },
  },
  permissions: {
    path: "/src/components/admin/AppPermsMatrix.vue",
    props: {
      appPermsMatrix: [
        {
          actorTypeId: actorTypes[0].id,
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
          ReportRead: false,
          ReportPost: false,
          ReportManage: false,
        },
      ],
    },
  },
  wizard: {
    path: "/src/components/form/ApplicationForm.vue",
    props: {
      mode: "create",
      initialData: {
        label: "",
        shortName: "",
        description: "",
        status: "to_validate",
        purposes: [],
        targetPopulations: [],
        tags: [],
        businessDivisions: [],
        myPerms: [],
      },
    },
  },
};

export const complianceBranches = [
  {
    id: "dima",
    fields: [
      ["compliance-dima-duration", "Durée d'interruption maximale"],
      ["compliance-dima-hno", "Heure non ouvrée"],
      ["compliance-dima-business-impact", "Impact métier"],
      ["compliance-dima-recovery-plan", "Plan de reprise"],
      ["compliance-dima-recovery-solutions", "Solutions de reprise"],
      ["compliance-dima-recovery-manager", "Responsable de la reprise"],
      ["compliance-dima-last-test-date", "Date du dernier test"],
      ["compliance-dima-test-result", "Résultat du dernier test"],
    ],
  },
  {
    id: "pdma",
    fields: [
      ["compliance-pdma-duration", "Durée (heures)"],
      ["compliance-pdma-data-types", "Types de données"],
      ["compliance-pdma-backup-frequency", "Fréquence de sauvegarde"],
      ["compliance-pdma-backup-storage", "Stockage de sauvegarde"],
      ["compliance-pdma-last-test-date", "Date du dernier test"],
      ["compliance-pdma-test-result", "Résultat du dernier test"],
      ["compliance-pdma-backup-method", "Méthode de sauvegarde"],
      ["compliance-pdma-restoration-manager", "Responsable de la restauration"],
    ],
  },
  {
    id: "homologation",
    fields: [["compliance-homologation-status", "Statut d'homologation"]],
  },
  {
    id: "rgpd",
    fields: [
      ["compliance-rgpd-aipd", "AIPD réalisée"],
      ["compliance-rgpd-dpo", "Nom du DPO"],
    ],
  },
  {
    id: "eco_index",
    fields: [["ecoindex-target-url-input", "URL cible EcoIndex"]],
  },
  {
    id: "dsfr",
    fields: [
      ["compliance-dsfr-implemented", "DSFR implémenté"],
      ["compliance-dsfr-version", "Version DSFR"],
    ],
  },
];

export async function mountRemainingScene(
  page: Page,
  scene: keyof typeof remainingScenes,
) {
  const definition = remainingScenes[scene];
  await mountProductionScene(page, definition.path, definition.props);
  await page.evaluate(async (scene) => {
    document.title = `RefApp — ${scene} synthétique NVDA`;
    const main = await (await fetch("/src/main.ts")).text();
    const paths = [...main.matchAll(/from\s+["']([^"']+)["']/g)].map(
      (match) => match[1],
    );
    const vuePath = paths.find((path) => path.includes("/vue.js"));
    if (!vuePath) throw new Error("Dépendance Vue réelle absente");
    const vue = (await import(vuePath)) as {
      createApp(component: unknown): { mount(element: HTMLElement): unknown };
      h(component: unknown, props: Record<string, unknown>): unknown;
    };
    const pathsToLoad = {
      toaster: "/src/stores/toasterStore.ts",
      component: "/src/components/AppToaster.vue",
      mermaid: "/src/composables/use-mermaid.ts",
    };
    const stores = (await import(pathsToLoad.toaster)) as {
      useToasterStore(): {
        messages: unknown[];
        removeMessage(id: string): void;
      };
    };
    const component = (await import(pathsToLoad.component)) as {
      default: unknown;
    };
    const toaster = stores.useToasterStore();
    const host = document.createElement("div");
    host.id = "at-remaining-real-toaster";
    document.body.append(host);
    vue
      .createApp({
        setup: () => () =>
          vue.h(component.default, {
            messages: toaster.messages,
            onCloseMessage: (id: string) => toaster.removeMessage(id),
          }),
      })
      .mount(host);
    if (scene === "wizard") {
      const directive = (await import(pathsToLoad.mermaid)) as {
        vUseMermaid: unknown;
      };
      const app = window.__rgaaAtHost?.app as unknown as
        | { directive(name: string, value: unknown): unknown }
        | undefined;
      app?.directive("use-mermaid", directive.vUseMermaid);
    }
  }, scene);
}

export async function finishRemaining(
  page: Page,
  network: Awaited<ReturnType<typeof simulatedRemainingNetwork>>,
  info: TestInfo,
) {
  await info.attach("remaining-network-synthetic-only", {
    body: Buffer.from(
      JSON.stringify(
        {
          baseCalls: network.calls,
          calls: network.remainingCalls,
          unhandled: network.unhandled,
          missingDecorativeIcons: network.missingDecorativeIcons,
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
    path: info.outputPath("remaining-final.png"),
    fullPage: true,
  });
}
