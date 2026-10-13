import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { nvdaTest } from "@guidepup/playwright";
import type { NVDAPlaywright } from "@guidepup/playwright";
import type { Page, TestInfo } from "@playwright/test";

const execFileAsync = promisify(execFile);

export async function windowsSnapshot() {
  const script = String.raw`
$ErrorActionPreference = 'Stop'
$os = Get-CimInstance Win32_OperatingSystem
$processes = @(Get-Process -Name nvda,firefox -ErrorAction SilentlyContinue | ForEach-Object {
  $file = Get-Item $_.Path
  [pscustomobject]@{
    name = $_.ProcessName; pid = $_.Id; sessionId = $_.SessionId; path = $_.Path
    productVersion = $file.VersionInfo.ProductVersion
    sha256 = (Get-FileHash -Path $_.Path -Algorithm SHA256).Hash.ToLowerInvariant()
  }
})
[pscustomobject]@{
  osCaption = $os.Caption; osVersion = $os.Version; osBuild = $os.BuildNumber
  architecture = $env:PROCESSOR_ARCHITECTURE
  interactive = [Environment]::UserInteractive
  sessionId = (Get-Process -Id $PID).SessionId
  processes = $processes
} | ConvertTo-Json -Depth 5 -Compress
`;
  const { stdout } = await execFileAsync("pwsh.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    script,
  ]);
  const parsed: unknown = JSON.parse(stdout.replace(/^\uFEFF/, ""));
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("processes" in parsed) ||
    !Array.isArray(parsed.processes)
  ) {
    throw new Error("Métadonnées Windows absentes ou illisibles.");
  }
  const processes: unknown[] = [...parsed.processes];
  return { ...parsed, processes };
}

export const test = nvdaTest.extend<
  Record<never, never>,
  { windowsGuard: void }
>({
  windowsGuard: [
    async ({}, use) => {
      if (
        process.platform !== "win32" ||
        process.env.GITHUB_ACTIONS !== "true" ||
        process.env.RGAA_ALLOW_WINDOWS_AT !== "1"
      ) {
        throw new Error(
          "Exécution réservée au runner Windows GitHub éphémère explicitement autorisé.",
        );
      }
      const before = await windowsSnapshot();
      if (
        before.processes.some(
          (item: unknown) =>
            item &&
            typeof item === "object" &&
            "name" in item &&
            item.name === "nvda",
        )
      ) {
        throw new Error(
          "Un NVDA préexistant est actif ; le pilote refuse de le remplacer.",
        );
      }
      if (
        !("interactive" in before) ||
        before.interactive !== true ||
        !("sessionId" in before) ||
        before.sessionId === 0
      ) {
        throw new Error("Pas de session Windows interactive utilisable.");
      }
      await mkdir("evidence", { recursive: true });
      await writeFile(
        `evidence/${process.env.RGAA_PHASE === "smoke" ? "smoke" : "cases"}-windows-before.json`,
        JSON.stringify(before, null, 2),
      );
      try {
        await use();
      } finally {
        const after = await windowsSnapshot();
        await writeFile(
          `evidence/${process.env.RGAA_PHASE === "smoke" ? "smoke" : "cases"}-windows-after.json`,
          JSON.stringify(after, null, 2),
        );
        if (
          after.processes.some(
            (item: unknown) =>
              item &&
              typeof item === "object" &&
              "name" in item &&
              item.name === "nvda",
          )
        ) {
          throw new Error(
            "NVDA reste actif après le finally du pilote ; fermeture à contrôler.",
          );
        }
      }
    },
    { scope: "worker", auto: true },
  ],
});

test.use({
  nvdaStartOptions: {
    capture: true,
    settings: {
      general: { language: "fr", saveConfigurationOnExit: false },
      speech: {
        synth: "espeak",
        espeak: { voice: "fr", rate: 70, volume: 100 },
      },
      presentation: { reportObjectDescriptions: true },
      virtualBuffers: { autoSayAllOnPageLoad: false, useScreenLayout: false },
    },
  },
});

export async function installOfflinePage(
  page: Page,
  name: string,
  html?: string,
) {
  const content =
    html ??
    (await readFile(
      new URL(`../fixtures/${name}.html`, import.meta.url),
      "utf8",
    ));
  await page.context().route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (
      url.origin === "http://127.0.0.1:4199" &&
      url.pathname === `/${name}.html`
    ) {
      await route.fulfill({
        contentType: "text/html; charset=utf-8",
        body: content,
      });
    } else if (
      url.origin === "http://127.0.0.1:4199" &&
      url.pathname === "/rendered-styles.css"
    ) {
      await route.fulfill({
        contentType: "text/css; charset=utf-8",
        body: await readFile(
          new URL("../fixtures/rendered-styles.css", import.meta.url),
          "utf8",
        ),
      });
    } else {
      await route.abort("blockedbyclient");
    }
  });
  await page.goto(`http://127.0.0.1:4199/${name}.html`);
}

export const normalizeSpeech = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[’'«»\".,;:—–-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export async function captureStep(
  nvda: NVDAPlaywright,
  step: string,
  action: () => Promise<void>,
  info: TestInfo,
) {
  await nvda.clearSpokenPhraseLog();
  const startedAt = new Date().toISOString();
  await action();
  const phrases = [...(await nvda.spokenPhraseLog())];
  await info.attach(`${step}-native-speech`, {
    body: Buffer.from(
      JSON.stringify(
        {
          step,
          startedAt,
          completedAt: new Date().toISOString(),
          source: "NVDA Remote native speak events",
          phrases,
        },
        null,
        2,
      ),
    ),
    contentType: "application/json",
  });
  return { phrases, text: normalizeSpeech(phrases.join(" ")) };
}

export async function attachIdentity(
  nvda: NVDAPlaywright,
  browserVersion: string,
  info: TestInfo,
) {
  const windows = await windowsSnapshot();
  const reader = windows.processes.find(
    (item: unknown) =>
      item &&
      typeof item === "object" &&
      "name" in item &&
      item.name === "nvda",
  );
  if (
    !reader ||
    typeof reader !== "object" ||
    !("productVersion" in reader) ||
    !String(reader.productVersion).includes("2026.2")
  ) {
    throw new Error(
      "Le vrai processus NVDA ne confirme pas la version 2026.2 attendue.",
    );
  }
  if (
    !("sessionId" in reader) ||
    !("sessionId" in windows) ||
    reader.sessionId !== windows.sessionId ||
    !windows.processes.some(
      (item) =>
        item &&
        typeof item === "object" &&
        "name" in item &&
        item.name === "firefox" &&
        "sessionId" in item &&
        item.sessionId === reader.sessionId,
    )
  ) {
    throw new Error(
      "NVDA et Firefox ne sont pas confirmés dans la même session interactive.",
    );
  }
  if (
    nvda.getSetting("general.language") !== "fr" ||
    nvda.getSetting("speech.synth") !== "espeak" ||
    nvda.getSetting("speech.espeak.voice") !== "fr"
  ) {
    throw new Error(
      "Langue française du profil ou de la synthèse non confirmée.",
    );
  }
  await info.attach("identity", {
    body: Buffer.from(
      JSON.stringify(
        {
          at: new Date().toISOString(),
          windows,
          readerBundle: nvda.version,
          readerLanguage: nvda.getSetting("general.language"),
          synthesizer: nvda.getSetting("speech.synth"),
          voice: nvda.getSetting("speech.espeak.voice"),
          browser: "Firefox Playwright (build patché)",
          browserVersion,
          checkoutHead: process.env.RGAA_PRODUCT_HEAD,
          retry: info.retry,
          spokenOutputSource:
            "Vrai NVDA, protocole Remote intégré, messages speak envoyés à la synthèse ; pas un enregistrement acoustique.",
        },
        null,
        2,
      ),
    ),
    contentType: "application/json",
  });
}
