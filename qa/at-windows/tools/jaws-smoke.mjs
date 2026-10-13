import { firefox } from "@playwright/test";
import { randomInt, createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

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
try {
  server = await firefox.launchServer({ headless: false, timeout: 60_000 });
  const browserPid = server.process().pid;
  if (!browserPid) throw new Error("Firefox PID is unavailable.");
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
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4199/jaws-witness.html");
  await page.bringToFront();
  // This focus prepares a single controlled element. Only native JAWS output
  // contributes to name/role assertions; this is not a keyboard conformance test.
  await page.getByRole("button", { name: label }).focus();
  await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-STA",
      "-File",
      path.join(tools, "focus-browser-window.ps1"),
      "-BrowserProcessId",
      String(browserPid),
    ],
    { timeout: 25_000 },
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
  const before = await capture("JAWS-WITNESS-BASELINE", "CaptureOnly");
  const after = await capture(
    "JAWS-WITNESS-NATIVE-CURRENT-CONTROL",
    "CurrentControl",
  );
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
} finally {
  if (context) await context.close();
  if (browser) await browser.close();
  if (server) await server.close();
}
