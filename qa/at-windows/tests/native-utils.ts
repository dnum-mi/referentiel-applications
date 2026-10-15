import type { NVDAPlaywright } from "@guidepup/playwright";
import type { TestInfo } from "@playwright/test";
import { captureStep, normalizeSpeech } from "./fixture.js";

export async function tabTo(
  nvda: NVDAPlaywright,
  name: string | RegExp,
  info: TestInfo,
  maximum = 35,
  direction: "Tab" | "Shift+Tab" = "Tab",
) {
  const visited = new Set<string>();
  for (let index = 0; index <= maximum; index++) {
    const result = await captureStep(
      nvda,
      `tab-reach-${index}`,
      () =>
        nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
          capture: true,
        }),
      info,
    );
    visited.add(result.text);
    const matches =
      typeof name === "string"
        ? result.text.includes(normalizeSpeech(name))
        : name.test(result.text);
    if (matches) return result;
    await captureStep(
      nvda,
      `native-${direction === "Tab" ? "tab" : "shift-tab"}-${index}`,
      () => nvda.press(direction, { capture: true }),
      info,
    );
  }
  throw new Error(
    `Commande non atteinte au clavier natif : ${String(name)}. Annonces effectivement rencontrées : ${JSON.stringify([...visited])}`,
  );
}

export async function shiftTabTo(
  nvda: NVDAPlaywright,
  name: string | RegExp,
  info: TestInfo,
  maximum = 35,
) {
  return tabTo(nvda, name, info, maximum, "Shift+Tab");
}

export async function activateCurrent(
  nvda: NVDAPlaywright,
  info: TestInfo,
  step: string,
) {
  return captureStep(
    nvda,
    step,
    () => nvda.press("Enter", { capture: true }),
    info,
  );
}

export async function passKeyToApplication(nvda: NVDAPlaywright, key: string) {
  await nvda.perform(nvda.keyboardCommands.ignoreNextKeyCombination, {
    capture: true,
  });
  // Guidepup 0.35 sends Control before every captured command to stop speech.
  // That extra key would consume NVDA's pass-next-key before the requested key.
  // Send this key without that prelude, then read the resulting native focus.
  // The focus report is an explicit read, not a claimed spontaneous announcement.
  await nvda.press(key, { capture: false });
  await nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
    capture: true,
  });
}
