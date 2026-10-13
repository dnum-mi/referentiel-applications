import { randomBytes } from "node:crypto";
import { expect } from "@playwright/test";
import {
  attachIdentity,
  captureStep,
  installOfflinePage,
  normalizeSpeech,
  test,
} from "./fixture.js";

test("Témoin réel : nom accessible, rôle français et activation annoncée par NVDA", async ({
  page,
  browser,
  nvda,
}, info) => {
  const nonce = randomBytes(6).toString("hex");
  const label = `Témoin parlé ${nonce}`;
  await installOfflinePage(
    page,
    "witness",
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Témoin NVDA RefApp</title></head><body><h1 aria-label="${label}">Texte visible différent</h1><button aria-label="Activer ${nonce}" onclick="document.querySelector('output').textContent='Activation réelle ${nonce}'">Texte de bouton différent</button><output aria-live="polite"></output></body></html>`,
  );
  await attachIdentity(nvda, browser.version(), info);
  const heading = await captureStep(
    nvda,
    "witness-heading",
    () => nvda.navigateToWebContent({ capture: true }),
    info,
  );
  expect(heading.text).toContain(normalizeSpeech(label));
  expect(heading.text).toMatch(/titre/);
  const button = await captureStep(
    nvda,
    "witness-button",
    () => nvda.perform(nvda.keyboardCommands.moveToNextButton),
    info,
  );
  expect(button.text).toContain(`activer ${nonce}`);
  expect(button.text).toMatch(/bouton/);
  const activation = await captureStep(
    nvda,
    "witness-activation",
    async () => {
      await nvda.act({ capture: true });
      await expect(page.locator("output")).toHaveText(
        `Activation réelle ${nonce}`,
      );
      await expect
        .poll(async () =>
          normalizeSpeech((await nvda.spokenPhraseLog()).join(" ")),
        )
        .toContain(`activation reelle ${nonce}`);
    },
    info,
  );
  expect(activation.text).toContain(`activation reelle ${nonce}`);
});
