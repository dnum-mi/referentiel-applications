import {
  expect,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import type { NVDAPlaywright } from "@guidepup/playwright";
import { captureStep, normalizeSpeech } from "./fixture.js";
import { activateCurrent, tabTo } from "./native-utils.js";
import type {
  prepareSupplement,
  ReplyKey,
} from "./supplement-interactive-utils.js";
// The locator identifies one real control, including repeated names. Only
// native keys move focus; only its arrival and focus-report phrases are used.
export async function reach(
  nvda: NVDAPlaywright,
  target: Locator,
  name: string | RegExp,
  info: TestInfo,
) {
  await expect(target).toBeVisible();
  const direction = await target.evaluate((element) =>
    document.activeElement &&
    document.activeElement !== document.body &&
    document.activeElement.compareDocumentPosition(element) &
      Node.DOCUMENT_POSITION_PRECEDING
      ? "Shift+Tab"
      : "Tab",
  );
  let arrival: Awaited<ReturnType<typeof captureStep>> | undefined;
  for (let index = 0; index <= 75; index++) {
    if (
      await target.evaluate(
        (element) =>
          element === document.activeElement ||
          element.contains(document.activeElement),
      )
    ) {
      if (index === 0) {
        await captureStep(
          nvda,
          "supplement-focus-away",
          () =>
            nvda.press(direction === "Tab" ? "Shift+Tab" : "Tab", {
              capture: true,
            }),
          info,
        );
        arrival = await captureStep(
          nvda,
          "supplement-focus-return",
          () => nvda.press(direction, { capture: true }),
          info,
        );
        await expect
          .poll(() =>
            target.evaluate(
              (element) =>
                element === document.activeElement ||
                element.contains(document.activeElement),
            ),
          )
          .toBe(true);
      }
      const current = await captureStep(
        nvda,
        "supplement-current-focus",
        () =>
          nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
            capture: true,
          }),
        info,
      );
      const phrases = [...(arrival?.phrases ?? []), ...current.phrases];
      const result = { phrases, text: normalizeSpeech(phrases.join(" ")) };
      if (typeof name === "string")
        expect(result.text).toContain(normalizeSpeech(name));
      else expect(result.text).toMatch(name);
      return result;
    }
    arrival = await captureStep(
      nvda,
      `supplement-native-${direction}-${index}`,
      () => nvda.press(direction, { capture: true }),
      info,
    );
  }
  throw new Error(`Control not reached with native keys: ${String(name)}`);
}

export async function enter(
  nvda: NVDAPlaywright,
  target: Locator,
  name: string | RegExp,
  value: string,
  info: TestInfo,
) {
  if (!/^[\x20-\x7e]+$/.test(value))
    throw new Error("Only fictional ASCII input is allowed in Guidepup type.");
  const current = await reach(nvda, target, name, info);
  expect(current.text).toMatch(
    /edition|multiligne|liste|combo|bouton rotatif|spin/,
  );
  await captureStep(
    nvda,
    "supplement-select-input",
    () => nvda.press("Control+a", { capture: true }),
    info,
  );
  await captureStep(
    nvda,
    "supplement-type-input",
    () => nvda.type(value, { capture: true }),
    info,
  );
  await expect(target).toHaveValue(value);
}

export async function releaseReply(
  page: Page,
  nvda: NVDAPlaywright,
  network: Awaited<ReturnType<typeof prepareSupplement>>,
  key: ReplyKey,
  settled: () => Promise<void>,
  info: TestInfo,
) {
  await expect
    .poll(() => network.pending.some((item) => item.key === key))
    .toBe(true);
  return captureStep(
    nvda,
    `supplement-response-${key}-${network.modes[key]}`,
    async () => {
      await nvda.capture(
        async () => {
          network.release(key);
          await settled();
          await page.waitForTimeout(1200);
        },
        { capture: true },
      );
    },
    info,
  );
}

export async function confirmBrowser(
  page: Page,
  nvda: NVDAPlaywright,
  info: TestInfo,
  message: string,
  agreement: boolean,
) {
  const event = page.waitForEvent("dialog");
  const opening = await activateCurrent(
    nvda,
    info,
    "supplement-confirmation-open",
  );
  const dialog = await event;
  expect(dialog.type()).toBe("confirm");
  expect(dialog.message()).toContain(message);
  expect(opening.text).toContain(normalizeSpeech(message));
  await tabTo(nvda, agreement ? /\bok\b.*bouton/ : /annuler.*bouton/, info, 4);
  await activateCurrent(
    nvda,
    info,
    agreement
      ? "supplement-confirmation-agree"
      : "supplement-confirmation-refuse",
  );
}

export async function chooseOrganization(
  nvda: NVDAPlaywright,
  select: Locator,
  info: TestInfo,
) {
  await expect(select).not.toBeDisabled();
  await reach(nvda, select, "Choisir une organisation de votre choix", info);
  const index = await select.evaluate((element) =>
    Array.from(element.querySelectorAll("option"))
      .filter((option) => !option.disabled)
      .findIndex((option) => option.value === "org-synthetic-001"),
  );
  expect(index).toBeGreaterThanOrEqual(0);
  const choice = await captureStep(
    nvda,
    "supplement-native-organization",
    async () => {
      await nvda.press("Alt+ArrowDown", { capture: true });
      await nvda.press("Home", { capture: true });
      for (let current = 0; current < index; current++)
        await nvda.press("ArrowDown", { capture: true });
      await nvda.press("Enter", { capture: true });
    },
    info,
  );
  await expect(select).toHaveValue("org-synthetic-001");
  expect(choice.text).toContain("organisation synthetique");
}
