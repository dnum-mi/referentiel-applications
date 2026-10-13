import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { nvdaTest } from "@guidepup/playwright";
import type { NVDAPlaywright } from "@guidepup/playwright";
import type { Page, TestInfo } from "@playwright/test";

const execFileAsync = promisify(execFile);
const phase = ["smoke", "interactive"].includes(process.env.RGAA_PHASE ?? "")
  ? process.env.RGAA_PHASE
  : "cases";

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
        `evidence/${phase}-windows-before.json`,
        JSON.stringify(before, null, 2),
      );
      try {
        await use();
      } finally {
        const after = await windowsSnapshot();
        await writeFile(
          `evidence/${phase}-windows-after.json`,
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
      virtualBuffers: {
        autoSayAllOnPageLoad: false,
        useScreenLayout: false,
        passThroughAudioIndication: false,
      },
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

/** Enter the document using Firefox's native frame navigation, without clicking a control. */
export async function focusDocumentStart(page: Page, nvda: NVDAPlaywright) {
  // A body click can toggle the first <summary>, and Tab can leave a document
  // with no focusable elements. Neither is a neutral setup action for these scenes.
  await page.bringToFront();
  const title = normalizeSpeech(await page.title());
  let browserFocused = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    await nvda.perform(nvda.keyboardCommands.reportTitle, { capture: true });
    if (normalizeSpeech(await nvda.lastSpokenPhrase()).includes(title)) {
      browserFocused = true;
      break;
    }
    await nvda.press("Alt+Escape", { capture: false });
  }
  if (!browserFocused)
    throw new Error("Firefox n’a pas le premier plan natif.");
  await nvda.press("Control+l", { capture: false });
  await nvda.press("F6", { capture: false });
  // Escape can close an application dialog. Use NVDA's own mode toggle and
  // require its spoken French mode confirmation instead.
  let browseMode = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    await nvda.perform(nvda.keyboardCommands.toggleBetweenBrowseAndFocusMode, {
      capture: true,
    });
    if (
      normalizeSpeech(await nvda.lastSpokenPhrase()).includes("mode navigation")
    ) {
      browseMode = true;
      break;
    }
  }
  if (!browseMode)
    throw new Error("Mode navigation NVDA non confirmé dans le document.");
  await nvda.press("Control+Home", { capture: true });
}

export async function captureStep(
  nvda: NVDAPlaywright,
  step: string,
  action: () => Promise<void>,
  info: TestInfo,
) {
  await nvda.clearSpokenPhraseLog();
  const startedAt = new Date().toISOString();
  try {
    await action();
  } finally {
    await info.attach(`${step}-native-speech`, {
      body: Buffer.from(
        JSON.stringify(
          {
            step,
            startedAt,
            completedAt: new Date().toISOString(),
            source: "NVDA Remote native speak events",
            phrases: [...(await nvda.spokenPhraseLog())],
          },
          null,
          2,
        ),
      ),
      contentType: "application/json",
    });
  }
  const phrases = [...(await nvda.spokenPhraseLog())];
  return { phrases, text: normalizeSpeech(phrases.join(" ")) };
}

test.afterEach(async ({}, info) => {
  if (info.status !== info.expectedStatus) {
    console.info(
      JSON.stringify({
        case: info.title,
        status: info.status,
        errors: info.errors.map((error) => error.message),
      }),
    );
  }
});

export async function attachIdentity(
  nvda: NVDAPlaywright,
  browserVersion: string,
  info: TestInfo,
) {
  // Guidepup 0.35 returns nested INI sections, not flattened dotted keys.
  const profile = nvda.getSettings();
  const setting = (...keys: string[]): unknown => {
    let value: unknown = profile;
    for (const key of keys) {
      if (!value || typeof value !== "object" || !(key in value))
        return undefined;
      value = (value as Record<string, unknown>)[key];
    }
    return value;
  };
  const readerLanguage = setting("general", "language");
  const synthesizer = setting("speech", "synth");
  const voice = setting("speech", "espeak", "voice");
  await info.attach("reader-profile", {
    body: Buffer.from(JSON.stringify({ readerLanguage, synthesizer, voice })),
    contentType: "application/json",
  });
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
  if (readerLanguage !== "fr" || synthesizer !== "espeak" || voice !== "fr") {
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
          readerLanguage,
          synthesizer,
          voice,
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
