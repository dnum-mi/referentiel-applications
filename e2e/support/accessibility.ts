import { expect, type Locator, type Page } from "@playwright/test";

/** WebKit suit le réglage macOS : Option+Tab inclut les liens dans la navigation. */
export function tabKey(page: Page): string {
  return page.context().browser()?.browserType().name() === "webkit"
    ? "Alt+Tab"
    : "Tab";
}

/**
 * Les descriptions, noms et descendants actifs doivent avoir une cible unique.
 * Un popup peut être monté à l'ouverture : son aria-controls optionnel est vérifié
 * lorsqu'il est développé ou lorsque sa cible existe. Les POM vérifient aussi
 * la relation effective entre chaque déclencheur et le popup ouvert.
 */
export async function expectAriaReferencesResolve(
  scope: Locator,
): Promise<void> {
  const invalid = await scope.evaluate((root) => {
    const counts = new Map<string, number>();
    for (const element of root.ownerDocument.querySelectorAll("[id]")) {
      counts.set(element.id, (counts.get(element.id) ?? 0) + 1);
    }
    const attributes = [
      "aria-labelledby",
      "aria-describedby",
      "aria-errormessage",
      "aria-controls",
      "aria-activedescendant",
    ];
    return [root, ...root.querySelectorAll("*")].flatMap((element) =>
      attributes.flatMap((attribute) =>
        (element.getAttribute(attribute) ?? "")
          .split(/\s+/)
          .filter(Boolean)
          .filter(
            (id) =>
              attribute !== "aria-controls" ||
              element.getAttribute("aria-expanded") === "true" ||
              counts.has(id),
          )
          .filter((id) => counts.get(id) !== 1)
          .map((id) => ({
            element: element.id || element.tagName.toLowerCase(),
            attribute,
            target: id,
            matches: counts.get(id) ?? 0,
          })),
      ),
    );
  });
  expect(
    invalid,
    "Les relations ARIA doivent avoir une cible unique dans la page",
  ).toEqual([]);
}

/** Parcours natif, sans focus forcé : le dialogue doit conserver le clavier dans les deux sens. */
export async function expectDialogKeyboardContainment(
  page: Page,
  dialog: Locator,
): Promise<void> {
  await expect(dialog).toBeVisible();
  const controls = dialog.locator(
    'button:visible:not([disabled]):not([tabindex="-1"]), input:visible:not([disabled]):not([tabindex="-1"]), select:visible:not([disabled]):not([tabindex="-1"]), textarea:visible:not([disabled]):not([tabindex="-1"]), a[href]:visible:not([tabindex="-1"]), [tabindex="0"]:visible:not([disabled])',
  );
  const count = await controls.count();
  expect(
    count,
    "Le dialogue doit contenir au moins une commande utilisable",
  ).toBeGreaterThan(0);
  for (const key of [tabKey(page), `Shift+${tabKey(page)}`]) {
    const visited = new Set<number>();
    for (let index = 0; index < count + 2; index++) {
      await page.keyboard.press(key);
      await expect
        .poll(() =>
          dialog.evaluate((element) =>
            element.contains(element.ownerDocument.activeElement),
          ),
        )
        .toBe(true);
      const position = await controls.evaluateAll((elements) =>
        elements.findIndex(
          (element) => element === element.ownerDocument.activeElement,
        ),
      );
      expect(
        position,
        "Tab doit rejoindre une commande du dialogue",
      ).toBeGreaterThanOrEqual(0);
      visited.add(position);
    }
    expect(
      visited.size,
      "Tab doit parcourir les commandes, sans rester bloqué sur une seule",
    ).toBe(count);
  }
}

/** Rejoindre une commande par la vraie tabulation, même si elle est placée avant le focus courant. */
export async function expectReachableByTab(
  page: Page,
  target: Locator,
): Promise<void> {
  await expect(target).toBeVisible();
  // Prouver la tabulation même si le scénario arrive avec cette commande déjà focalisée.
  if (
    await target.evaluate(
      (element) => element === element.ownerDocument.activeElement,
    )
  ) {
    await page.keyboard.press(`Shift+${tabKey(page)}`);
  }
  // Firefox peut rendre le clavier au chrome en fin de document : revenir avec Maj+Tab
  // lorsqu'une cible précède le focus, plutôt que dépendre d'une boucle implicite du navigateur.
  const backwards = await target.evaluate((element) => {
    const active = element.ownerDocument.activeElement;
    return (
      !!active &&
      !!(
        element.compareDocumentPosition(active) &
        Node.DOCUMENT_POSITION_FOLLOWING
      )
    );
  });
  const key = backwards ? `Shift+${tabKey(page)}` : tabKey(page);
  for (let step = 0; step < 120; step++) {
    await page.keyboard.press(key);
    if (
      await target.evaluate(
        (element) =>
          element === element.ownerDocument.activeElement &&
          element.ownerDocument.hasFocus(),
      )
    ) {
      await expect(target).toBeInViewport();
      return;
    }
  }
  throw new Error(
    "La commande est visible mais n'est pas atteinte par 120 tabulations natives",
  );
}
