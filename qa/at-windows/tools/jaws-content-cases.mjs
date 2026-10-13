import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const tools = path.dirname(fileURLToPath(import.meta.url));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const normalise = (text) =>
  text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    // Observed native product-name separation only; no omitted field or plural repair.
    .replace(/\bref\s+app\b/gu, "refapp")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const contains = (text, expected) =>
  normalise(text).includes(normalise(expected));

const documentPlans = {
  "AT-D01": {
    footer:
      "Export RefApp. Les informations reproduisent le périmètre du format correspondant.",
    tables: [
      ["Applications — ligne 1", "Identifiant", "Valeur", "app-synthetic-001"],
      ["Applications — ligne 2", "Identifiant", "Valeur", "app-synthetic-002"],
      [
        "Hébergements — ligne 1",
        "ID Application",
        "Valeur",
        "app-synthetic-001",
      ],
      ["Acteurs — ligne 1", "ID Application", "Valeur", "app-synthetic-001"],
      [
        "Conformités — ligne 1",
        "ID Application",
        "Valeur",
        "app-synthetic-001",
      ],
      [
        "Ressources externes — ligne 1",
        "ID Application",
        "Valeur",
        "app-synthetic-001",
      ],
      [
        "Signalements — ligne 1",
        "ID Application",
        "Valeur",
        "app-synthetic-001",
      ],
      [
        "Relations sortantes — ligne 1",
        "ID Application",
        "Valeur",
        "app-synthetic-001",
      ],
      ["Statuts — ligne 1", "ID Application", "Valeur", "app-synthetic-001"],
    ],
  },
  "AT-D02": {
    footer:
      "Export RefApp. Les informations reproduisent le périmètre du format correspondant.",
    tables: [],
  },
  "AT-D03": {
    footer: "Ce rapport conserve les données et le journal de l’import.",
    tables: [
      [
        "Détail par ligne — entrée 1",
        "Onglet",
        "Valeur",
        "Acteurs synthétiques",
      ],
      [
        "Détail par ligne — entrée 2",
        "Onglet",
        "Valeur",
        "Applications synthétiques",
      ],
      [
        "Détail par ligne — entrée 3",
        "Onglet",
        "Valeur",
        "Conformités synthétiques",
      ],
      ["Résumé de l’import", "Créés", "Valeur", "1"],
      [
        "Journal d’exécution",
        "1",
        "Message",
        'Journal synthétique; "avec guillemets"',
      ],
    ],
  },
};

/** Continue the approved witness in its existing browser, context and JAWS PID.
 * This module never installs, launches or restarts a reader/browser. Result
 * witnesses are observations to review, never an automatic global RGAA status.
 */
export async function runJawsContentCases({
  page,
  browserPid,
  readerPid,
  fixturesDirectory,
  outputDirectory,
  frozenCaptureScriptPath,
  focusBrowserScriptPath,
  actionScriptPath = path.join(tools, "jaws-content-action.ps1"),
  maxContentMinutes = 22,
  maxReadChunksPerDocument = 40,
  readChunkSeconds = 8,
}) {
  if (
    process.platform !== "win32" ||
    process.env.GITHUB_ACTIONS !== "true" ||
    process.env.JAWS_ALLOW_APPROVED_USE !== "1"
  ) {
    throw new Error(
      "Content capture requires the already approved disposable Windows runner.",
    );
  }
  if (!Number.isInteger(browserPid) || !Number.isInteger(readerPid))
    throw new Error("Original process IDs required.");
  if (readChunkSeconds < 1 || readChunkSeconds > 12 || maxContentMinutes > 25)
    throw new Error("Short bounded content budget required.");
  const fixtureRoot = path.resolve(fixturesDirectory);
  const output = path.resolve(outputDirectory);
  await mkdir(output, { recursive: true });
  const manifest = JSON.parse(
    await readFile(path.join(fixtureRoot, "manifest.json"), "utf8"),
  );
  const provenance = JSON.parse(
    await readFile(path.join(fixtureRoot, "documents-provenance.json"), "utf8"),
  );
  const assets = new Map();
  const hashes = [];
  const addAsset = async (name, expectedHash) => {
    const bytes = await readFile(path.join(fixtureRoot, name));
    const actualHash = hash(bytes);
    if (actualHash !== expectedHash)
      throw new Error(`Exact fixture hash differs: ${name}`);
    assets.set(`/${name}`, bytes);
    hashes.push({ file: name, sha256: actualHash });
  };
  for (const scene of manifest.scenes) await addAsset(scene.file, scene.sha256);
  for (const document of provenance.documents)
    await addAsset(document.file, document.sha256);
  await addAsset(manifest.capturedStyles.file, manifest.capturedStyles.sha256);
  const oracles = {};
  for (const id of Object.keys(documentPlans)) {
    const bytes = await readFile(path.join(fixtureRoot, `${id}.oracle.json`));
    oracles[id] = JSON.parse(bytes.toString("utf8"));
    hashes.push({ file: `${id}.oracle.json`, sha256: hash(bytes) });
  }
  const began = Date.now();
  const deadline = began + maxContentMinutes * 60_000;
  const result = {
    startedUtc: new Date().toISOString(),
    status: "partial",
    reader: "JAWS 2025",
    browser: "Firefox",
    browserPid,
    readerPid,
    fixtures: hashes,
    cases: [],
    rgaaVerdict: null,
    sameInstanceRequired: true,
    otherReaderAllowed: false,
    domAsSpeech: false,
    speechInjected: false,
    sourceChecksOwnedByParent: true,
    staticVueHandlersAbsent: true,
    criterion712Excluded: true,
    historyCapacityStrings: 500,
    readerSettingsNotChanged: true,
    oracleNormalisation:
      "Unicode accents/punctuation/whitespace; exact observed Ref App / RefApp separation only.",
    tableOracleSource:
      "Controlled synthetic inputs and real generator field order, captions and labels; no native speech reconstructed from DOM.",
  };
  const resultPath = path.join(output, "jaws-content-results.json");
  const save = () => writeFile(resultPath, JSON.stringify(result, null, 2));
  const assertBudget = () => {
    if (Date.now() + 25_000 >= deadline)
      throw new Error("Content time budget reached; preserve partial results.");
  };
  const routeHandler = async (route) => {
    const url = new URL(route.request().url());
    const bytes = assets.get(url.pathname);
    if (!bytes || url.origin !== "http://127.0.0.1:4199")
      return route.abort("blockedbyclient");
    return route.fulfill({
      body: bytes,
      contentType: url.pathname.endsWith(".css")
        ? "text/css; charset=utf-8"
        : "text/html; charset=utf-8",
    });
  };
  // Most recently registered route has precedence over the witness handler.
  await page.context().route("http://127.0.0.1:4199/**", routeHandler);
  const load = async (id) => {
    assertBudget();
    await page.goto(`http://127.0.0.1:4199/${id}.html`);
    await page.bringToFront();
    await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-STA",
        "-File",
        focusBrowserScriptPath,
        "-BrowserProcessId",
        String(browserPid),
      ],
      { timeout: 25_000 },
    );
  };
  const capture = async (
    id,
    action,
    { wait = 1, readerWindow = false, channel = "document" } = {},
  ) => {
    assertBudget();
    const historyFile = path.join(output, `${id}.native-history.jsonl`);
    await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-STA",
        "-File",
        actionScriptPath,
        "-BrowserProcessId",
        String(browserPid),
        "-ReaderProcessId",
        String(readerPid),
        "-CaseId",
        id,
        "-OutputFile",
        historyFile,
        "-FrozenCaptureScriptPath",
        frozenCaptureScriptPath,
        "-NativeAction",
        action,
        "-WaitSeconds",
        String(wait),
        ...(readerWindow ? ["-AllowReaderWindow"] : []),
      ],
      { timeout: 40_000, maxBuffer: 2 * 1024 * 1024 },
    );
    const records = (await readFile(historyFile, "utf8"))
      .trim()
      .split(/\r?\n/u)
      .map(JSON.parse);
    const record = records.at(-1);
    const annotation = {
      action,
      channel,
      recordNumber: records.length,
      historyFile: path.basename(historyFile),
      resetObserved: record.resetObserved,
      actionHistorySeparated: record.actionHistorySeparated,
      newlyCapturedNativeText: record.newlyCapturedNativeText,
      bufferOverflowNotObservableAsExactEntryCount: true,
    };
    if (!record.actionHistorySeparated)
      throw new Error(
        `Native action history not separable for ${id}/${action}; raw evidence preserved.`,
      );
    return annotation;
  };
  try {
    // G speaks the authored image alternative. INSERT+G is deliberately never
    // used: it is not this protocol's authored-description reading method.
    for (const scene of manifest.scenes) {
      const item = {
        id: scene.id,
        kind: "figure",
        status: "partial",
        actions: [],
        rgaaVerdict: null,
      };
      result.cases.push(item);
      await save();
      try {
        await load(scene.id);
        item.actions.push(await capture(scene.id, "Beginning"));
        item.actions.push(
          await capture(scene.id, "Graphic", {
            wait: 3,
            channel: "direct-image",
          }),
        );
        item.actions.push(
          await capture(scene.id, "SayLine", {
            wait: 3,
            channel: "direct-image",
          }),
        );
        const directText = item.actions
          .filter((a) => a.channel === "direct-image")
          .map((a) => a.newlyCapturedNativeText)
          .join("\n");
        const descriptions = scene.references
          .filter((reference) => /desc|description/u.test(reference.id))
          .map((reference) => reference.text);
        item.nameFromFixture = scene.name;
        item.directNamePresent = contains(directText, scene.name);
        item.directDescriptionWitnesses = descriptions.map((expected) => ({
          expected,
          present: contains(directText, expected),
        }));
        item.directInternalFallbackPresent = scene.internalFallback
          ? contains(directText, scene.internalFallback)
          : null;
        // Authored descriptions available through the documented reader element
        // information viewer remain a distinct native channel from G/SayLine.
        item.actions.push(
          await capture(scene.id, "DetailedElementInfo", {
            wait: 2,
            readerWindow: true,
            channel: "reader-element-information",
          }),
        );
        item.actions.push(
          await capture(scene.id, "SayAllChunk", {
            wait: readChunkSeconds,
            readerWindow: true,
            channel: "reader-element-information",
          }),
        );
        const infoText = item.actions
          .filter((a) => a.channel === "reader-element-information")
          .map((a) => a.newlyCapturedNativeText)
          .join("\n");
        item.readerInformationDescriptionWitnesses = descriptions.map(
          (expected) => ({ expected, present: contains(infoText, expected) }),
        );
        item.actions.push(
          await capture(scene.id, "Escape", {
            readerWindow: true,
            channel: "reader-element-information",
          }),
        );
        item.status = "native-figure-observed-pending-review";
        item.staticActionsExcluded =
          "Vue handlers, filters, sorting, zoom, graph-node activation and changes of depth are not qualified by copied HTML.";
      } catch (error) {
        item.error = error.message;
      }
      await save();
    }
    for (const [id, plan] of Object.entries(documentPlans)) {
      const item = {
        id,
        kind: "document",
        status: "partial",
        chunks: [],
        tables: [],
        actions: [],
        rgaaVerdict: null,
      };
      result.cases.push(item);
      await save();
      try {
        await load(id);
        item.actions.push(await capture(id, "Beginning"));
        let sameChunkCount = 0;
        for (let index = 0; index < maxReadChunksPerDocument; index += 1) {
          const chunk = await capture(id, "SayAllChunk", {
            wait: readChunkSeconds,
          });
          item.chunks.push(chunk);
          const all = item.chunks
            .map((c) => c.newlyCapturedNativeText)
            .join("\n");
          item.footerExpected = plan.footer;
          item.footerPresentInNativeHistory = contains(all, plan.footer);
          item.valueWitnesses = oracles[id].requiredNativeText.map(
            (expected) => ({ expected, present: contains(all, expected) }),
          );
          const current = normalise(chunk.newlyCapturedNativeText);
          const previous = item.chunks.at(-2);
          sameChunkCount =
            previous && current === normalise(previous.newlyCapturedNativeText)
              ? sameChunkCount + 1
              : 0;
          await save();
          if (
            item.footerPresentInNativeHistory ||
            sameChunkCount >= 2 ||
            !current
          )
            break;
        }
        item.linearReadOutcome =
          item.footerPresentInNativeHistory &&
          item.valueWitnesses.every((v) => v.present)
            ? "footer-and-required-fixture-values-observed"
            : "partial-or-required-values-unobserved";
        if (plan.tables.length) {
          item.actions.push(await capture(id, "Beginning"));
          for (const [caption, rowHeader, columnHeader, value] of plan.tables) {
            const table = {
              captionExpected: caption,
              expectedRowHeader: rowHeader,
              expectedColumnHeader: columnHeader,
              expectedValue: value,
              actions: [],
              status: "partial",
              rgaaVerdict: null,
            };
            item.tables.push(table);
            // T may stop at the caption. DOWN then table-layer CTRL+HOME enters
            // and positions in the real first cell before the native movements.
            for (const action of [
              "Table",
              "EnterCell",
              "FirstCell",
              "CellDown",
              "CellRight",
            ]) {
              table.actions.push(
                await capture(id, action, {
                  wait: 2,
                  channel: "table-navigation",
                }),
              );
            }
            const cellText = table.actions.at(-1).newlyCapturedNativeText;
            table.lastCellNativeText = cellText;
            table.possibleOutsideCellDiagnostic =
              /not (?:in|within).*table|pas.*(?:cellule|tableau)|hors.*tableau/iu.test(
                cellText,
              );
            table.sameNativeCellWitnesses = [
              rowHeader,
              columnHeader,
              value,
            ].map((expected) => ({
              expected,
              present: contains(cellText, expected),
            }));
            table.status = table.possibleOutsideCellDiagnostic
              ? "reader-placement-incomplete"
              : table.sameNativeCellWitnesses.every((v) => v.present)
                ? "cell-header-value-witnesses-observed-pending-review"
                : "native-cell-captured-header-association-unconfirmed";
            await save();
          }
        } else
          item.tableApplicability =
            "No table: generator emits title hierarchy and definition lists for D02.";
        item.status = "native-document-observed-pending-review";
      } catch (error) {
        item.error = error.message;
      }
      await save();
    }
    result.status =
      result.cases.length === 10 && result.cases.every((item) => !item.error)
        ? "ten-cases-exercised-native-review-required"
        : "partial-native-campaign";
  } finally {
    result.finishedUtc = new Date().toISOString();
    result.contentElapsedMinutes = (Date.now() - began) / 60_000;
    await save();
    await page.context().unroute("http://127.0.0.1:4199/**", routeHandler);
  }
  return result;
}
