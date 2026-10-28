import { createServer, type Server } from "node:http";
import { expect, test as base } from "@playwright/test";
import { SearchPage } from "../pom/search.page";

interface CatalogueOptions {
  registry: unknown;
  configStatus?: number;
  mobile?: boolean;
  revocation?: "all" | "html";
}

const test = base.extend<{
  catalogue: (options: CatalogueOptions) => Promise<SearchPage>;
}>({
  catalogue: async ({ page }, use) => {
    const servers: Server[] = [];
    try {
      await use(async (options) => {
        const beta =
          Array.isArray(options.registry) &&
          options.registry.includes("catalogue-excel-export");
        const excelLabel = beta
          ? "Exporter en Excel (fonctionnalité bêta)"
          : "Exporter en Excel";
        const server = createServer((request, response) => {
          if (request.url === "/api/v2/config") {
            response.writeHead(options.configStatus ?? 200, {
              "Content-Type": "application/json",
            });
            response.end(JSON.stringify({ betaFeatures: options.registry }));
          } else if (request.url === "/api/v2/users/me") {
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ additionalPermissions: [] }));
          } else {
            response.writeHead(200, {
              "Content-Type": "text/html; charset=utf-8",
            });
            response.end(`<!doctype html><html lang="fr"><body>
              <style>
                .mobile { display: none; }
                @media (max-width: 767px) { .desktop { display: none; } .mobile { display: inline-block; } }
              </style>
              ${["desktop", "mobile"]
                .map(
                  (kind) => `<button class="${kind}" data-format="excel"
                    data-testid="application-export-btn${kind === "mobile" ? "-mobile" : ""}"
                    aria-label="${excelLabel}">Exporter en Excel
                    ${beta ? '<span aria-hidden="true">Bêta</span>' : ""}</button>`,
                )
                .join("")}
              <button data-format="html" data-testid="applications-export-html-btn"
                aria-label="Exporter en HTML (fonctionnalité bêta)">Exporter en HTML
                <span aria-hidden="true">Bêta</span></button>
              <script>
                for (const button of document.querySelectorAll('button')) {
                  button.addEventListener('click', async () => {
                    await fetch('/api/v2/users/me');
                    for (const control of document.querySelectorAll('button')) {
                      if (${JSON.stringify(options.revocation ?? "all")} === 'all' || control.dataset.format === 'html') control.remove();
                    }
                  });
                }
              </script>
            </body></html>`);
          }
        });
        servers.push(server);
        await new Promise<void>((resolve, reject) => {
          server.once("error", reject);
          server.listen(0, "127.0.0.1", resolve);
        });
        const address = server.address();
        if (!address || typeof address === "string") {
          throw new Error("Serveur de catalogue de test indisponible");
        }
        await page.setViewportSize({
          width: options.mobile ? 375 : 1280,
          height: 900,
        });
        await page.goto(`http://127.0.0.1:${address.port}`);
        return new SearchPage(page);
      });
    } finally {
      await Promise.all(
        servers.map(
          (server) =>
            new Promise<void>((resolve, reject) => {
              server.close((error) => (error ? reject(error) : resolve()));
            }),
        ),
      );
    }
  },
});

for (const beta of [true, false]) {
  const registry = [
    "catalogue-html-export",
    ...(beta ? ["catalogue-excel-export"] : []),
  ];
  for (const mobile of [false, true]) {
    test(`POM Excel ${beta ? "bêta" : "sorti de bêta"}, ${mobile ? "mobile" : "desktop"} : registre, badge et nom accessible`, async ({
      catalogue,
    }) => {
      const search = await catalogue({ registry, mobile });
      expect(await search.isExcelExportBeta()).toBe(beta);
      await search.expectExcelExport(true, mobile);
      await search.expectHtmlBetaExport(true);
    });

    test(`POM Excel ${beta ? "bêta" : "sorti de bêta"}, ${mobile ? "mobile" : "desktop"} : révocation avant clic`, async ({
      catalogue,
    }) => {
      const search = await catalogue({ registry, mobile });
      await search.expectExcelExport(true, mobile);
      await search.expectExcelRevocationBeforeDownload(mobile);
      await search.expectHtmlBetaExport(false);
    });
  }
}

test("POM révocation HTML : conserve l'export Excel sorti de bêta", async ({
  catalogue,
}) => {
  const search = await catalogue({
    registry: ["catalogue-html-export"],
    revocation: "html",
  });
  await search.expectHtmlRevocationBeforeDownload();
  await search.expectExcelExport(true);
});

for (const registry of [undefined, "catalogue-excel-export", [42]]) {
  test(`POM registre invalide ${JSON.stringify(registry)} : aucun statut stable déduit par défaut`, async ({
    catalogue,
  }) => {
    const search = await catalogue({ registry });
    await expect(search.isExcelExportBeta()).rejects.toThrow(
      /Registre betaFeatures absent ou invalide/,
    );
  });
}

test("POM configuration inaccessible : aucun statut stable déduit par défaut", async ({
  catalogue,
}) => {
  const search = await catalogue({ registry: [], configStatus: 503 });
  await expect(search.isExcelExportBeta()).rejects.toThrow(
    /Configuration bêta inaccessible \(503\)/,
  );
});
