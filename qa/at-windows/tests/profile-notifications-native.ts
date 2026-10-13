import {
  expect,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import type { NVDAPlaywright } from "@guidepup/playwright";
import { captureStep, normalizeSpeech } from "./fixture.js";
import type { profileNotificationsNetwork } from "./profile-notifications-utils.js";

// The DOM identifies the intended object only. Arrival and its spoken name
// always come from real NVDA commands; no DOM string is emitted as speech.
export async function reachG5(
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
  for (let index = 0; index < 55; index++) {
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
          "g5-focus-away",
          () =>
            nvda.press(direction === "Tab" ? "Shift+Tab" : "Tab", {
              capture: true,
            }),
          info,
        );
        arrival = await captureStep(
          nvda,
          "g5-focus-return",
          () => nvda.press(direction, { capture: true }),
          info,
        );
        await expect(target).toBeFocused();
      }
      const current = await captureStep(
        nvda,
        "g5-current-focus",
        () =>
          nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
            capture: true,
          }),
        info,
      );
      const phrases = [...(arrival?.phrases ?? []), ...current.phrases],
        text = normalizeSpeech(phrases.join(" "));
      if (typeof name === "string")
        expect(text).toContain(normalizeSpeech(name));
      else expect(text).toMatch(name);
      return { phrases, text };
    }
    arrival = await captureStep(
      nvda,
      `g5-native-${direction}-${index}`,
      () => nvda.press(direction, { capture: true }),
      info,
    );
  }
  throw new Error(`G5 command not reached by native keyboard: ${String(name)}`);
}

export async function releaseG5(
  page: Page,
  nvda: NVDAPlaywright,
  network: Awaited<ReturnType<typeof profileNotificationsNetwork>>,
  outcome: "error" | "success",
  settled: () => Promise<void>,
  step: string,
  info: TestInfo,
) {
  await expect.poll(() => network.pending.length).toBe(1);
  return captureStep(
    nvda,
    step,
    async () => {
      await nvda.capture(
        async () => {
          network.release(outcome);
          await settled();
          await page.waitForTimeout(1500);
        },
        { capture: true },
      );
    },
    info,
  );
}
