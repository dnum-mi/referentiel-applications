import { expect } from "@playwright/test";
import {
  test,
  attachIdentity,
  captureStep,
  normalizeSpeech,
  focusDocumentStart,
} from "./fixture.js";
import {
  alpha,
  finishInteractive,
  mountProductionScene,
  simulatedNetwork,
  timeData,
} from "./interactive-utils.js";
import { activateCurrent, shiftTabTo, tabTo } from "./native-utils.js";

test.use({ serviceWorkers: "block" });
test.beforeEach(async ({}, info) => {
  info.setTimeout(300_000);
  info.annotations.push({
    type: "RGAA",
    description:
      "7.1.2 — lot interactif ciblé, pas couverture des 34 cas complète",
  });
});

const charts = [
  {
    component: "ApplicationsIqChart",
    id: "applications-iq-chart",
    title: "Répartition des applications par IQ",
    caption: "Répartition des applications par tranche d’IQ arrondi",
    columns: ["Tranche d’IQ", "Nombre d’applications"],
  },
  {
    component: "ApplicationsChart",
    id: "applications-chart",
    title: "Nombre d’applications référencées",
    caption: "Nombre d’applications référencées par mois",
    columns: ["Mois", "Nombre d’applications"],
  },
  {
    component: "IqChart",
    id: "iq-chart",
    title: "Évolution de l’IQ moyen",
    caption: "IQ moyen",
    columns: ["Date", "IQ moyen"],
  },
];

for (const chart of charts) {
  test(`AT-INT-${chart.id} — vraies bascules tableau et retour graphique`, async ({
    page,
    browser,
    nvda,
  }, info) => {
    const network = await simulatedNetwork(page);
    await page.goto(network.base);
    await mountProductionScene(
      page,
      `/src/components/stats/${chart.component}.vue`,
    );
    const button = page.getByTestId(`${chart.id}-toggle-view`);
    await expect(button).toBeEnabled();
    await attachIdentity(nvda, browser.version(), info);
    await focusDocumentStart(page, nvda);
    const reach = await captureStep(
      nvda,
      "native-first-chart-button",
      () =>
        nvda.perform(nvda.keyboardCommands.moveToNextButton, { capture: true }),
      info,
    );
    expect(reach.text).toContain("voir le tableau");
    expect(reach.text).toMatch(/bouton/);
    const shown = await activateCurrent(nvda, info, "table-button-activated");
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId(`${chart.id}-table`)).toBeVisible();
    const buttonState = await captureStep(
      nvda,
      "table-view-pressed-state",
      () => nvda.perform(nvda.keyboardCommands.reportCurrentFocus),
      info,
    );
    expect(buttonState.text).toContain("voir le graphique");
    expect(buttonState.text + shown.text).toMatch(/enfonce|appuye|presse/);
    await focusDocumentStart(page, nvda);
    const table = await captureStep(
      nvda,
      "native-table-first-row",
      async () => {
        await nvda.perform(nvda.keyboardCommands.moveToNextTable);
        // Native table quick navigation stops on its caption. Enter a real
        // cell before the commands that move within rows and columns.
        await nvda.press("ArrowDown", { capture: true });
        await nvda.perform(nvda.keyboardCommands.moveToNextColumn);
        await nvda.perform(nvda.keyboardCommands.moveToNextRow);
      },
      info,
    );
    expect(table.text).toContain(normalizeSpeech(chart.caption));
    expect(table.text).not.toContain("pas dans une cellule de tableau");
    for (const column of chart.columns)
      expect(table.text).toContain(normalizeSpeech(column));
    // Browse-table commands leave DOM focus on the old toggle. Rejoin the
    // tab sequence from the actual reading position before seeking it.
    await captureStep(
      nvda,
      "leave-table-for-native-controls",
      () => nvda.press("Shift+Tab", { capture: true }),
      info,
    );
    await shiftTabTo(nvda, "Voir le graphique", info);
    await activateCurrent(nvda, info, "return-graphic-activated");
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByTestId(`${chart.id}-canvas`)).toBeVisible();
    await focusDocumentStart(page, nvda);
    const image = await captureStep(
      nvda,
      "graphic-after-return",
      () => nvda.perform(nvda.keyboardCommands.moveToNextGraphic),
      info,
    );
    expect(image.text).toContain(normalizeSpeech(chart.title));
    const painted = await page
      .getByTestId(`${chart.id}-canvas`)
      .evaluate((canvas) => {
        if (!(canvas instanceof HTMLCanvasElement))
          throw new Error("Canvas réel absent.");
        const pixels = canvas
          .getContext("2d")
          ?.getImageData(0, 0, canvas.width, canvas.height).data;
        return pixels
          ? pixels.some((value, index) => index % 4 === 3 && value > 0)
          : false;
      });
    expect(painted).toBe(true);
    await finishInteractive(page, network, info);
  });
}

test("AT-INT-TIME — vrai résumé, ouverture du tableau complet puis fermeture", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await simulatedNetwork(page);
  await page.goto(network.base);
  await mountProductionScene(
    page,
    "/src/components/technical-debt/TechnicalDebtChart.vue",
    { data: timeData },
  );
  await page.locator(".td-svg a").first().waitFor();
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  const link = await tabTo(
    nvda,
    "Consulter le tableau complet du diagramme TIME",
    info,
  );
  expect(link.text).toMatch(/lien/);
  await activateCurrent(nvda, info, "time-complete-table-link");
  await expect(
    page.getByTestId("technical-debt-transcription"),
  ).toHaveAttribute("open", "");
  const table = await captureStep(
    nvda,
    "time-native-table",
    () => nvda.perform(nvda.keyboardCommands.readLine),
    info,
  );
  expect(table.text).toMatch(/maturite|tableau|application/);
  await captureStep(
    nvda,
    "leave-time-table-for-summary",
    () => nvda.press("Shift+Tab", { capture: true }),
    info,
  );
  await shiftTabTo(nvda, "Tableau de synthèse TIME", info);
  const collapsed = await activateCurrent(nvda, info, "time-summary-close");
  await expect(
    page.getByTestId("technical-debt-transcription"),
  ).not.toHaveAttribute("open", "");
  expect(collapsed.text).toMatch(/replie|reduit|ferme|condense/);
  await finishInteractive(page, network, info);
});

test("AT-INT-relations — profondeur, filtre, zoom et vrai Réessayer après HTTP500 simulé", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await simulatedNetwork(page);
  await page.goto(network.base);
  await mountProductionScene(page, "/src/components/RelationShipGraph.vue", {
    applicationId: alpha,
  });
  await page.locator(".graph-container svg a").first().waitFor();
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  const zoomButton = await tabTo(nvda, "Zoomer", info);
  expect(zoomButton.text).toContain("bouton");
  const group = page.locator(".graph-container svg > g"),
    before = await group.getAttribute("transform");
  await activateCurrent(nvda, info, "zoom-command");
  await expect.poll(() => group.getAttribute("transform")).not.toBe(before);
  await tabTo(nvda, "Saisir la profondeur du réseau", info);
  await nvda.press("Control+a", { capture: true });
  await nvda.type("2", { capture: true });
  const depth = await captureStep(
    nvda,
    "depth-updated",
    () => nvda.press("Tab"),
    info,
  );
  await expect(page.getByTestId("relations-graph-status")).toContainText(
    "4 applications et 3 relations",
  );
  expect(depth.text).toContain("4 applications");
  expect(depth.text).toContain("profondeur 2");
  await tabTo(nvda, /utilise.*donn/, info);
  const filtered = await captureStep(
    nvda,
    "relationship-filter-changed",
    () => nvda.press("Space"),
    info,
  );
  await expect(page.getByTestId("relations-graph-status")).toContainText(
    "4 applications et 2 relations",
  );
  expect(filtered.text).toContain("2 relations");
  network.state.graphError = true;
  await tabTo(nvda, "Saisir la profondeur du réseau", info);
  await nvda.press("Control+a", { capture: true });
  await nvda.type("3", { capture: true });
  const failed = await captureStep(
    nvda,
    "graph-get-500",
    () => nvda.press("Tab"),
    info,
  );
  await expect(page.getByRole("alert")).toContainText(
    "Impossible de charger le réseau des relations",
  );
  expect(failed.text).toContain(
    "impossible de charger le reseau des relations",
  );
  network.state.graphError = false;
  await tabTo(nvda, "Réessayer le chargement du réseau", info);
  const recovered = await activateCurrent(nvda, info, "graph-retry");
  await expect(page.locator(".graph-container svg")).toBeVisible();
  expect(recovered.text).toContain("applications");
  await finishInteractive(page, network, info);
});
