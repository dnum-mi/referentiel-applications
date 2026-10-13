import { firefox } from "@playwright/test";
import { randomInt, createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { runJawsContentCases } from "./jaws-content-cases.mjs";

if (
  process.platform !== "win32" ||
  process.env.GITHUB_ACTIONS !== "true" ||
  process.env.JAWS_ALLOW_APPROVED_USE !== "1"
) {
  throw new Error(
    "Real JAWS smoke is restricted to the approved disposable Windows runner.",
  );
}
const execFileAsync = promisify(execFile);
const tools = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(
  process.env.JAWS_EVIDENCE_DIR ?? "evidence/jaws-approved",
);
await mkdir(output, { recursive: true });
// The content helper also invokes the frozen focus script; keep every attempt
// under the same approved evidence directory without changing reader settings.
process.env.JAWS_EVIDENCE_DIR = output;
const words = [
  "cobalt",
  "basilic",
  "tulipe",
  "safran",
  "abricot",
  "pivoine",
  "menthe",
  "galet",
  "flocon",
  "lilas",
  "grenat",
  "muguet",
  "ananas",
  "pollen",
  "corail",
  "noisette",
];
const nonceWords = Array.from(
  { length: 6 },
  () => words[randomInt(words.length)],
);
const nonce = nonceWords.join(" ");
const label = `Verifier ${nonce}`;
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Temoin JAWS ${nonce}</title></head><body><main><h1>Temoin natif ${nonce}</h1><p>Page synthetique sans donnees privees.</p><button type="button">${label}</button></main></body></html>`;
await writeFile(
  path.join(output, "witness-controlled-input.json"),
  JSON.stringify(
    {
      createdUtc: new Date().toISOString(),
      nonceWords,
      expectedName: label,
      expectedNativeRoleWord: "bouton",
      nameOracleSource:
        "fresh controlled fixture, never speech reconstructed from DOM",
      htmlSha256: createHash("sha256").update(html).digest("hex"),
    },
    null,
    2,
  ),
);
const speechFile = path.join(output, "jaws-native-history.jsonl");
let server;
let browser;
let context;
let page;
let browserPid;
let launcherPid;
let browserLaunchedAtUtc;
let originalReaderPid;
let stage = "initialisation";
let nativeWitnessPassed = false;
const timeline = [];
const markStage = (name) => {
  stage = name;
  const entry = { stage, at: new Date().toISOString() };
  timeline.push(entry);
  console.info(JSON.stringify(entry));
};
const focusScript = path.join(tools, "focus-browser-window.ps1");
const focusDiagnostics = path.join(output, "firefox-focus-attempts.jsonl");
try {
  markStage("inspect-existing-jaws-and-approved-demo");
  const { stdout: demoOutput } = await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-STA",
      "-File",
      path.join(tools, "prepare-jaws-demo.ps1"),
      "-ContinueDemo",
      ...(process.env.JAWS_ALLOW_INITIAL_RESTART_DEFER === "1"
        ? ["-AllowDeferInitialRestart"]
        : []),
    ],
    { timeout: 35_000, maxBuffer: 2 * 1024 * 1024 },
  );
  const demo = JSON.parse(demoOutput);
  if (
    demo.readyForNativeWitness !== true ||
    !Number.isInteger(demo.readerPid) ||
    demo.readerPid <= 0
  ) {
    throw new Error(
      "The original authorised JAWS instance is not ready for its native witness.",
    );
  }
  originalReaderPid = demo.readerPid;
  await writeFile(
    path.join(output, "jaws-native-instance.json"),
    JSON.stringify(demo, null, 2),
  );
  markStage("firefox-launch");
  browserLaunchedAtUtc = new Date().toISOString();
  server = await firefox.launchServer({ headless: false, timeout: 60_000 });
  launcherPid = server.process().pid;
  if (!launcherPid) throw new Error("Firefox launcher PID is unavailable.");
  browserPid = launcherPid;
  browser = await firefox.connect(server.wsEndpoint());
  context = await browser.newContext({
    locale: "fr-FR",
    viewport: { width: 1280, height: 800 },
  });
  await context.route("**/*", async (route) => {
    if (route.request().url() === "http://127.0.0.1:4199/jaws-witness.html") {
      await route.fulfill({
        contentType: "text/html; charset=utf-8",
        body: html,
      });
    } else await route.abort("blockedbyclient");
  });
  page = await context.newPage();
  markStage("witness-page-load");
  await page.goto("http://127.0.0.1:4199/jaws-witness.html");
  await page.bringToFront();
  // This focus prepares a single controlled element. Only native JAWS output
  // contributes to name/role assertions; this is not a keyboard conformance test.
  await page.getByRole("button", { name: label }).focus();
  markStage("native-firefox-foreground");
  const { stdout: focusOutput } = await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-STA",
      "-File",
      focusScript,
      "-BrowserProcessId",
      String(browserPid),
      "-ExpectedTitle",
      await page.title(),
      "-BrowserExecutable",
      firefox.executablePath(),
      "-LaunchedAfterUtc",
      browserLaunchedAtUtc,
      "-DiagnosticFile",
      focusDiagnostics,
    ],
    { timeout: 25_000 },
  );
  const focused = JSON.parse(focusOutput);
  if (
    focused.foregroundVerified !== true ||
    focused.launcherPid !== launcherPid ||
    !Number.isInteger(focused.browserPid) ||
    focused.browserPid <= 0 ||
    !Array.isArray(focused.identity?.chain) ||
    !focused.identity.chain.some((entry) => entry.processId === launcherPid)
  ) {
    throw new Error(
      "Native Firefox window identity/ancestry was not confirmed.",
    );
  }
  // Windows Firefox starts a launcher process and a separate UI process. Only
  // the verified UI PID owns the HWND used by all subsequent native captures.
  browserPid = focused.browserPid;
  await writeFile(
    path.join(output, "firefox-native-identity.json"),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        browserLaunchedAtUtc,
        ...focused,
        isNativeSpeech: false,
        rgaaVerdict: null,
      },
      null,
      2,
    ),
  );
  const capture = async (caseId, action) => {
    await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-STA",
        "-File",
        path.join(tools, "capture-jaws-history.ps1"),
        "-BrowserProcessId",
        String(browserPid),
        "-CaseId",
        caseId,
        "-OutputFile",
        speechFile,
        "-NativeAction",
        action,
        "-WaitSeconds",
        "3",
      ],
      { timeout: 25_000, maxBuffer: 2 * 1024 * 1024 },
    );
    const records = (await readFile(speechFile, "utf8"))
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line));
    return records.at(-1);
  };
  markStage("native-history-baseline");
  const before = await capture("JAWS-WITNESS-BASELINE", "CaptureOnly");
  markStage("native-current-control");
  const after = await capture(
    "JAWS-WITNESS-NATIVE-CURRENT-CONTROL",
    "CurrentControl",
  );
  if (
    before.readerPid !== originalReaderPid ||
    after.readerPid !== originalReaderPid
  ) {
    throw new Error(
      "JAWS changed instance between preparation and native witness.",
    );
  }
  const previous = before.rawSpeechHistory.replace(/\r\n/g, "\n");
  const current = after.rawSpeechHistory.replace(/\r\n/g, "\n");
  if (!current.startsWith(previous)) {
    throw new Error(
      "Native history cannot be separated from the baseline; no witness verdict.",
    );
  }
  const newlyCapturedNativeText = current.slice(previous.length);
  const normalised = newlyCapturedNativeText
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  const normalisedName = label.toLowerCase();
  const namePresent = normalised.includes(normalisedName);
  const frenchRolePresent = /\bbouton\b/.test(normalised);
  const result = {
    observedUtc: new Date().toISOString(),
    source: "real JAWS native Speech History after INSERT+TAB",
    newlyCapturedNativeText,
    exactNameFromFreshFixturePresent: namePresent,
    nativeFrenchRolePresent: frenchRolePresent,
    roleWordNotInFixtureText: !html.includes("bouton"),
    baselinePreservedAsPrefix: true,
    browser: "Firefox",
    browserVersion: browser.version(),
    browserPid,
    launcherPid,
    originalReaderPid,
    fixtureNonceWords: nonceWords,
    speechInjected: false,
    domAsSpeech: false,
    audioRecording: false,
    keyboardConformanceClaim: false,
    outcome:
      namePresent && frenchRolePresent
        ? "native-french-witness-passed-only"
        : "native-witness-not-qualified",
    rgaaVerdict: null,
  };
  await writeFile(
    path.join(output, "native-french-witness.json"),
    JSON.stringify(result, null, 2),
  );
  if (!namePresent || !frenchRolePresent)
    throw new Error(
      "Fresh native name and French role were not both captured.",
    );
  nativeWitnessPassed = true;
  markStage("native-content-cases");
  const content = await runJawsContentCases({
    page,
    browserPid,
    readerPid: originalReaderPid,
    fixturesDirectory: path.join(tools, "../fixtures"),
    outputDirectory: path.join(output, "content-cases"),
    frozenCaptureScriptPath: path.join(tools, "capture-jaws-history.ps1"),
    focusBrowserScriptPath: path.join(tools, "focus-browser-window.ps1"),
    maxContentMinutes: 18,
  });
  if (content.status !== "ten-cases-exercised-native-review-required")
    throw new Error(
      "Native content capture is incomplete; actual JAWS evidence is retained for review.",
    );
  markStage("native-content-cases-complete");
} catch (error) {
  await writeFile(
    path.join(output, "jaws-smoke-error.json"),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        stage,
        timeline,
        browserPid,
        launcherPid,
        browserLaunchedAtUtc,
        originalReaderPid,
        nativeWitnessPassed,
        rgaaVerdict: null,
        error: {
          name: error instanceof Error ? error.name : typeof error,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          code: error?.code,
          stdout: error?.stdout,
          stderr: error?.stderr,
        },
        focusDiagnostics,
        snapshotSource:
          "diagnostic desktop/browser pixels and UIA, never substituted for JAWS speech",
      },
      null,
      2,
    ),
  );
  if (page && !page.isClosed()) {
    try {
      await page.screenshot({
        path: path.join(output, "firefox-page-error.png"),
        fullPage: true,
        timeout: 5_000,
      });
      await writeFile(
        path.join(output, "firefox-page-error.json"),
        JSON.stringify(
          {
            at: new Date().toISOString(),
            url: page.url(),
            title: await page.title(),
            activeElement: await page.evaluate(() => ({
              tag: document.activeElement?.tagName,
              id: document.activeElement?.id,
              ariaLabel: document.activeElement?.getAttribute("aria-label"),
            })),
            isNativeSpeech: false,
            confirmsOsForeground: false,
          },
          null,
          2,
        ),
      );
    } catch (snapshotError) {
      console.error("Browser error snapshot:", String(snapshotError));
    }
  }
  if (browserPid) {
    try {
      await execFileAsync(
        "powershell.exe",
        [
          "-NoProfile",
          "-STA",
          "-File",
          focusScript,
          "-BrowserProcessId",
          String(browserPid),
          "-DiagnosticFile",
          focusDiagnostics,
          "-SnapshotOnly",
        ],
        { timeout: 15_000, maxBuffer: 2 * 1024 * 1024 },
      );
    } catch (snapshotError) {
      console.error("Desktop error snapshot:", String(snapshotError));
    }
  }
  throw error;
} finally {
  if (context) await context.close();
  if (browser) await browser.close();
  if (server) await server.close();
}
