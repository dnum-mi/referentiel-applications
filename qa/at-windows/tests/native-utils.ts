import type { NVDAPlaywright } from "@guidepup/playwright";
import type { TestInfo } from "@playwright/test";
import { captureStep, normalizeSpeech } from "./fixture.js";

export async function tabTo(
  nvda: NVDAPlaywright,
  name: string | RegExp,
  info: TestInfo,
  maximum = 35,
) {
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
    const matches =
      typeof name === "string"
        ? result.text.includes(normalizeSpeech(name))
        : name.test(result.text);
    if (matches) return result;
    await nvda.press("Tab", { capture: false });
  }
  throw new Error(`Commande non atteinte au clavier natif : ${String(name)}`);
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
