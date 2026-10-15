import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type Page, type TestInfo } from "@playwright/test";
import { mountProductionScene, simulatedNetwork } from "./interactive-utils.js";

const fixtures = fileURLToPath(new URL("../fixtures/", import.meta.url));
const syntheticApplicationId = "app-synthetic-001";

async function verifySources(sources: { file: string; sha256: string }[]) {
  const root =
    process.env.RGAA_PRODUCT_ROOT ??
    fileURLToPath(new URL("../../../", import.meta.url));
  for (const source of sources) {
    const bytes = await readFile(path.join(root, source.file));
    if (createHash("sha256").update(bytes).digest("hex") !== source.sha256)
      throw new Error(
        `Generator source differs from provenance: ${source.file}`,
      );
  }
}

export async function installSyntheticSwagger(page: Page) {
  const directory = path.resolve(
    process.env.RGAA_SWAGGER_FIXTURE_DIR ?? path.join(fixtures, "swagger"),
  );
  const provenance = JSON.parse(
    await readFile(path.join(directory, "provenance.json"), "utf8"),
  ) as {
    files: { file: string; sha256: string }[];
    sources: { file: string; sha256: string }[];
  };
  await verifySources(provenance.sources);
  const assets = new Map<string, Buffer>();
  for (const file of provenance.files) {
    const bytes = await readFile(path.join(directory, file.file));
    if (createHash("sha256").update(bytes).digest("hex") !== file.sha256)
      throw new Error(`Swagger fixture differs: ${file.file}`);
    assets.set(`/at-swagger/${file.file}`, bytes);
  }
  const forbidden: { method: string; url: string }[] = [];
  await page.context().route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    const bytes = assets.get(url.pathname);
    if (
      request.method() !== "GET" ||
      url.origin !== "http://127.0.0.1:4199" ||
      !bytes
    ) {
      forbidden.push({
        method: request.method(),
        url: url.origin + url.pathname,
      });
      await route.abort("blockedbyclient");
      return;
    }
    const contentType = url.pathname.endsWith(".js")
      ? "application/javascript"
      : url.pathname.endsWith(".css")
        ? "text/css"
        : url.pathname.endsWith(".json")
          ? "application/json"
          : "text/html";
    await route.fulfill({
      body: bytes,
      contentType: `${contentType};charset=utf-8`,
    });
  });
  await page.goto("http://127.0.0.1:4199/at-swagger/index.html");
  await page.locator(".info .title").waitFor();
  return { forbidden, provenance };
}

export async function simulatedExportsNetwork(page: Page) {
  const provenance = JSON.parse(
    await readFile(path.join(fixtures, "exports-provenance.json"), "utf8"),
  ) as {
    sources: { file: string; sha256: string }[];
    outputs: { file: string; sha256: string }[];
    fixturesSha256: string;
    syntheticOnly: boolean;
  };
  if (provenance.syntheticOnly !== true)
    throw new Error("Controlled synthetic exports are required.");
  await verifySources(provenance.sources);
  for (const file of provenance.outputs) {
    const bytes = await readFile(path.join(fixtures, file.file));
    if (createHash("sha256").update(bytes).digest("hex") !== file.sha256)
      throw new Error(`Generated export fixture differs: ${file.file}`);
  }
  if (
    createHash("sha256")
      .update(await readFile(path.join(fixtures, "inputs.json")))
      .digest("hex") !== provenance.fixturesSha256
  )
    throw new Error(
      "Controlled export input differs from its generator provenance.",
    );
  const base = await simulatedNetwork(page);
  const fixtureInput = JSON.parse(
    await readFile(path.join(fixtures, "inputs.json"), "utf8"),
  ) as {
    importReport: unknown;
  };
  const paths = {
    catalogueHtml: "/api/v2/applications/export/html",
    catalogueExcel: "/api/v2/applications/export/excel",
    productHtml: `/api/v2/applications/${syntheticApplicationId}/export/html`,
    productPowerpoint: `/api/v2/applications/${syntheticApplicationId}/export/powerpoint`,
    import: "/api/v2/import/excel",
  };
  const calls: {
    method: string;
    pathname: string;
    outcome: string;
    status?: number;
  }[] = [];
  const pending: {
    pathname: string;
    resolve(value: "error" | "success"): void;
  }[] = [];
  await page.context().route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (url.origin !== new URL(base.base).origin) return route.fallback();
    if (req.method() === "GET" && url.pathname === "/api/v2/users/me") {
      await route.fulfill({
        json: {
          id: "user-synthetic-001",
          email: "exports@example.invalid",
          role: "ADMIN",
          permissions: ["DataExport"],
          additionalPermissions: [],
          followedApplications: [],
          emailNotificationsEnabled: false,
          gristUrl: "",
          hasGristApiKey: false,
          gristDocIds: [],
        },
      });
      return;
    }
    if (req.method() === "POST" && url.pathname === paths.import) {
      calls.push({
        method: "POST",
        pathname: url.pathname,
        outcome: "synthetic-import-preparation-only",
        status: 200,
      });
      await route.fulfill({ json: fixtureInput.importReport });
      return;
    }
    const format = Object.entries(paths).find(
      ([key, value]) => key !== "import" && value === url.pathname,
    )?.[0];
    if (!format) return route.fallback();
    const expectedMethod = format.startsWith("catalogue") ? "GET" : "POST";
    if (req.method() !== expectedMethod)
      throw new Error(`Unexpected export method: ${req.method()}`);
    calls.push({
      method: req.method(),
      pathname: url.pathname,
      outcome: "pending-intercepted",
    });
    const outcome = await new Promise<"error" | "success">((resolve) =>
      pending.push({ pathname: url.pathname, resolve }),
    );
    const status = outcome === "error" ? 500 : 200;
    calls.push({
      method: req.method(),
      pathname: url.pathname,
      outcome,
      status,
    });
    if (outcome === "error") {
      await route.fulfill({
        status,
        json: { message: "Défaillance d’export synthétique" },
      });
      return;
    }
    const name =
      format === "catalogueHtml"
        ? "AT-D01.html"
        : format === "productHtml"
          ? "AT-D02.html"
          : format === "catalogueExcel"
            ? "synthetic-catalogue.xlsx"
            : "synthetic-product.pptx";
    const body = await readFile(path.join(fixtures, name));
    await route.fulfill({
      status,
      body,
      contentType: format.endsWith("Html")
        ? "text/html;charset=utf-8"
        : format === "catalogueExcel"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
  });
  return {
    ...base,
    exportCalls: calls,
    pending,
    release(outcome: "error" | "success") {
      const request = pending.shift();
      if (!request) throw new Error("No intercepted export is pending.");
      request.resolve(outcome);
    },
    cancelPending() {
      for (const request of pending.splice(0)) request.resolve("error");
    },
  };
}

export async function mountExportScene(
  page: Page,
  scene: "catalogue" | "product" | "report",
) {
  const component =
    scene === "catalogue"
      ? "/src/components/ApplicationSearchActions.vue"
      : scene === "product"
        ? "/src/components/ApplicationProductExport.vue"
        : "/src/components/admin/AdminBatchData.vue";
  await mountProductionScene(
    page,
    component,
    scene === "product" ? { applicationId: syntheticApplicationId } : {},
  );
  // A real AppToaster renders the actual store messages. No synthetic aria-live
  // region or text is substituted for the application's notification component.
  await page.evaluate(async () => {
    const main = await (await fetch("/src/main.ts")).text();
    const specifiers = [...main.matchAll(/from\s+["']([^"']+)["']/g)].map(
      (match) => match[1],
    );
    const vuePath = specifiers.find((value) => value.includes("/vue.js"));
    if (!vuePath) throw new Error("Real Vue dependency unavailable.");
    const vue = (await import(vuePath)) as {
      createApp(component: unknown): { mount(element: HTMLElement): unknown };
      h(component: unknown, props: Record<string, unknown>): unknown;
    };
    const storePath = "/src/stores/toasterStore.ts";
    const componentPath = "/src/components/AppToaster.vue";
    const stores = (await import(storePath)) as {
      useToasterStore(): {
        messages: unknown[];
        removeMessage(id: string): void;
      };
    };
    const component = (await import(componentPath)) as { default: unknown };
    const store = stores.useToasterStore();
    const host = document.createElement("div");
    host.id = "at-export-real-toaster";
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
  if (scene === "report") {
    // Preparation only. Client does not parse the workbook; the server request
    // is intercepted and returns the controlled input's actual report fields.
    await page
      .getByTestId("admin-import-file")
      .setInputFiles(path.join(fixtures, "synthetic-catalogue.xlsx"));
    await page.getByTestId("admin-import-submit").click();
    await page.getByTestId("admin-import-report").waitFor();
  }
}

export async function finishExports(
  page: Page,
  network: Awaited<ReturnType<typeof simulatedExportsNetwork>>,
  info: TestInfo,
) {
  await info.attach("exports-synthetic-network", {
    body: Buffer.from(
      JSON.stringify(
        {
          calls: network.exportCalls,
          baseCalls: network.calls,
          unhandled: network.unhandled,
          realBusinessWrites: false,
        },
        null,
        2,
      ),
    ),
    contentType: "application/json",
  });
  await page.screenshot({
    path: info.outputPath("exports.png"),
    fullPage: true,
  });
}
