import type { NVDAPlaywright } from "@guidepup/playwright";
import type { TestInfo } from "@playwright/test";
import { captureStep, normalizeSpeech } from "./fixture.js";

export async function tabTo(
  nvda: NVDAPlaywright,
  name: string | RegExp,
  info: TestInfo,
  maximum = 35,
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
      `native-tab-${index}`,
      () => nvda.press("Tab", { capture: true }),
      info,
    );
  }
  throw new Error(
    `Commande non atteinte au clavier natif : ${String(name)}. Annonces effectivement rencontrées : ${JSON.stringify([...visited])}`,
  );
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
