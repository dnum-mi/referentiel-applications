import { expect } from "@playwright/test";
import {
  test,
  attachIdentity,
  captureStep,
  focusDocumentStart,
} from "./fixture.js";
import {
  activateCurrent,
  tabTo,
  passKeyToApplication,
} from "./native-utils.js";
import {
  selectionNetwork,
  mountSelectionScene,
  finishSelection,
  mountHeaderSelection,
} from "./selection-interactive-utils.js";
import {
  beta,
  simulatedNetwork,
  finishInteractive,
} from "./interactive-utils.js";

test.use({ serviceWorkers: "block" });
for (const kind of ["tags", "divisions"] as const) {
  test(`AT-INT-U07-${kind} — sélections multiples, retrait, erreur/vide, liste et retour`, async ({
    page,
    browser,
    nvda,
  }, info) => {
    info.setTimeout(420_000);
    info.annotations.push({
      type: "RGAA",
      description:
        "7.1.2 — variantes réelles des sélections multiples ; API fictive, paroles NVDA natives à constater",
    });
    const network = await selectionNetwork(page, kind);
    await page.goto(network.base);
    await mountSelectionScene(page, kind);
    const prefix =
      kind === "tags"
        ? "Retirer le tag : "
        : "Retirer la direction métier : Direction ";
    const removeAlpha = page.getByRole("button", {
      name: prefix + "Alpha",
      exact: true,
    });
    const removeBeta = page.getByRole("button", {
      name: prefix + "Beta",
      exact: true,
    });
    const input = page.getByRole("combobox");
    await attachIdentity(nvda, browser.version(), info);
    await focusDocumentStart(page, nvda);
    expect((await tabTo(nvda, prefix + "Alpha", info)).text).toContain(
      "bouton",
    );
    await expect(removeAlpha).toBeFocused();
    const first = await activateCurrent(nvda, info, "selection-remove-alpha");
    await expect(removeAlpha).toHaveCount(0);
    await expect(removeBeta).toBeFocused();
    expect(first.text).toContain("beta");
    await activateCurrent(nvda, info, "selection-remove-beta");
    await expect(removeBeta).toHaveCount(0);
    await expect(input).toBeFocused();
    const returned = await captureStep(
      nvda,
      "selection-return-input",
      () =>
        nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
          capture: true,
        }),
      info,
    );
    expect(returned.text).toContain(
      kind === "tags" ? "rechercher un tag" : "directions metier",
    );
    expect(returned.text).toMatch(/liste deroulante|autocompletion|edition/);
    for (const state of ["error", "empty"] as const) {
      network.selectionState.mode = state;
      await nvda.press("Control+a", { capture: false });
      const typed = await captureStep(
        nvda,
        `selection-${state}-native-query`,
        () =>
          nvda.type(state === "error" ? "Refus" : "Vide", { capture: true }),
        info,
      );
      const settled = await captureStep(
        nvda,
        `selection-${state}-late-feedback`,
        async () => {
          await nvda.capture(
            async () => {
              if (state === "error")
                await expect(page.getByRole("alert")).not.toHaveText("");
              else
                await expect(
                  page.getByText(/^Aucun résultat\.?$/).first(),
                ).toBeAttached();
            },
            { capture: true },
          );
        },
        info,
      );
      expect(`${typed.text} ${settled.text}`).toContain(
        state === "error" ? "erreur lors de la recherche" : "aucun resultat",
      );
      await expect(input).toBeFocused();
    }
    network.selectionState.mode = "ok";
    for (const name of ["Alpha", "Beta"]) {
      await nvda.press("Control+a", { capture: false });
      const typed = await captureStep(
        nvda,
        `selection-${name}-query`,
        () => nvda.type(name, { capture: true }),
        info,
      );
      const list = await captureStep(
        nvda,
        `selection-${name}-list-ready`,
        async () => {
          await nvda.capture(
            async () => {
              await expect(page.getByRole("option")).toHaveCount(2);
            },
            { capture: true },
          );
        },
        info,
      );
      expect(`${typed.text} ${list.text}`).toMatch(/2 suggestion/);
      const choice = await captureStep(
        nvda,
        `selection-${name}-option`,
        async () => {
          await nvda.press("ArrowDown", { capture: true });
          if (name === "Beta") await nvda.press("ArrowDown", { capture: true });
        },
        info,
      );
      expect(choice.text).toContain(name.toLowerCase());
      await expect(input).toHaveAttribute("aria-activedescendant", /./);
      if (name === "Alpha") {
        await captureStep(
          nvda,
          "selection-close-popup-native",
          async () => {
            await passKeyToApplication(nvda, "Escape");
          },
          info,
        );
        await expect(page.getByRole("option")).toHaveCount(0);
        await expect(input).toBeFocused();
        await nvda.press("ArrowDown", { capture: true });
      }
      await activateCurrent(nvda, info, `selection-choose-${name}`);
      await expect(name === "Alpha" ? removeAlpha : removeBeta).toBeVisible();
      await expect(input).toBeFocused();
    }
    await finishSelection(page, network, info);
  });
}

for (const compact of [false, true]) {
  test(`AT-INT-U07-header-${compact ? "compact" : "desktop"} — recherche, Échap et navigation réelle du composant`, async ({
    page,
    browser,
    nvda,
  }, info) => {
    info.setTimeout(420_000);
    const network = await simulatedNetwork(page);
    if (compact) await page.setViewportSize({ width: 600, height: 800 });
    await page.goto(network.base);
    await mountHeaderSelection(page);
    await attachIdentity(nvda, browser.version(), info);
    await focusDocumentStart(page, nvda);
    const input = page.locator("#app-search");
    const opener = page.getByTestId("open-search-btn");
    const dialog = page.getByRole("dialog", {
      name: "Recherche d’une application",
    });
    if (compact) {
      await tabTo(nvda, "Ouvrir la recherche", info);
      const opened = await activateCurrent(nvda, info, "header-open-search");
      await expect(dialog).toBeVisible();
      await expect(input).toBeFocused();
      expect(opened.text).toContain("recherche d une application");
      expect(opened.text).toMatch(/dialogue|dialog/);
    } else {
      await tabTo(nvda, "Recherche d’une application", info);
      await expect(input).toBeFocused();
      // The preparation deliberately left NVDA in browse mode while this
      // already-focused combobox matched tabTo without a new Tab event.
      const entered = await activateCurrent(
        nvda,
        info,
        "header-enter-forms-mode",
      );
      expect(entered.text).toContain("mode formulaire");
    }
    for (let attempt = 0; attempt < (compact ? 2 : 1); attempt++) {
      const typed = await captureStep(
        nvda,
        `header-query-${attempt}`,
        () => nvda.type("app", { capture: true }),
        info,
      );
      const settled = await captureStep(
        nvda,
        `header-results-${attempt}`,
        async () => {
          await nvda.capture(
            async () => {
              await expect(page.getByRole("option")).toHaveCount(2);
            },
            { capture: true },
          );
        },
        info,
      );
      expect(`${typed.text} ${settled.text}`).toContain("2 suggestion");
      if (compact && attempt === 0) {
        for (const step of ["popup", "dialog"]) {
          await captureStep(
            nvda,
            `header-escape-${step}`,
            async () => {
              await passKeyToApplication(nvda, "Escape");
            },
            info,
          );
          if (step === "popup") {
            await expect(page.getByRole("option")).toHaveCount(0);
            await expect(dialog).toBeVisible();
            await expect(input).toBeFocused();
          }
        }
        await expect(dialog).not.toBeVisible();
        await expect(opener).toBeFocused();
        await activateCurrent(nvda, info, "header-reopen-search");
        await expect(input).toBeFocused();
      }
    }
    const selected = await captureStep(
      nvda,
      "header-native-option",
      () => nvda.press("ArrowDown", { capture: true }),
      info,
    );
    expect(selected.text).toContain("application fictive beta");
    await activateCurrent(nvda, info, "header-confirm-navigation");
    await expect
      .poll(() => page.evaluate(() => window.__rgaaHeaderPath?.()))
      .toBe(`/applications/${beta}`);
    if (compact) {
      await expect(dialog).not.toBeVisible();
      await expect(opener).toBeFocused();
    } else {
      await expect(input).toHaveValue("");
      await expect(input).toBeFocused();
    }
    expect(
      network.calls.some(
        (call) =>
          call.pathname === "/api/v2/applications" &&
          new URLSearchParams(call.query).get("qPrefix") === "app",
      ),
    ).toBe(true);
    await finishInteractive(page, network, info);
  });
}
