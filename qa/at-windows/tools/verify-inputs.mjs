import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = process.env.RGAA_PRODUCT_ROOT;
if (!root)
  throw new Error(
    "RGAA_PRODUCT_ROOT doit désigner le checkout produit à contrôler.",
  );
const fixtures = fileURLToPath(new URL("../fixtures/", import.meta.url));
const manifest = JSON.parse(
  await readFile(path.join(fixtures, "manifest.json"), "utf8"),
);
const documents = JSON.parse(
  await readFile(path.join(fixtures, "documents-provenance.json"), "utf8"),
);
const digest = (content) => createHash("sha256").update(content).digest("hex");
const inputs = [...manifest.sourcePaths, ...documents.sources];
for (const item of inputs) {
  if (
    !item.file ||
    !/^[a-f0-9]{64}$/.test(item.sha256) ||
    path.isAbsolute(item.file) ||
    item.file.includes("..")
  )
    throw new Error("Référence de source invalide.");
  const hash = digest(await readFile(path.join(root, item.file)));
  if (hash !== item.sha256)
    throw new Error(
      `Source modifiée depuis le rendu : ${item.file}. Recapturer avant toute qualification.`,
    );
}
for (const item of [...manifest.scenes, ...documents.documents]) {
  if (item.file !== `${item.id}.html`)
    throw new Error("Nom de fixture invalide.");
  const html = await readFile(path.join(fixtures, item.file), "utf8");
  if (digest(html) !== item.sha256)
    throw new Error(`Fixture altérée : ${item.id}.`);
  if (/<script\b|\bon\w+\s*=/i.test(html))
    throw new Error(
      `${item.id} : code exécutable inattendu dans le contenu statique.`,
    );
}
if (manifest.scenes.length !== 7 || documents.documents.length !== 3)
  throw new Error(
    "Les 7 figures et 3 documents attendus ne sont pas présents.",
  );
if (manifest.pageErrors.length || manifest.blockedWrites.length)
  throw new Error(
    "Le rendu source comporte des erreurs ou écritures bloquées.",
  );
if (
  digest(await readFile(path.join(fixtures, manifest.capturedStyles.file))) !==
  manifest.capturedStyles.sha256
)
  throw new Error("CSS de rendu altérée.");
const icons = JSON.parse(
  await readFile(path.join(fixtures, "ri-provenance.json"), "utf8"),
);
if (
  digest(await readFile(path.join(fixtures, "ri-icons.json"))) !==
  icons.iconsSha256
)
  throw new Error("Copie des icônes de test altérée.");
console.log(
  JSON.stringify({
    status: "verified",
    graphics: 7,
    documents: 3,
    checkedSources: inputs.length,
    renderedHead: manifest.productHead,
    replayHead: process.env.RGAA_PRODUCT_HEAD,
    fixtures:
      "entièrement synthétiques, copies exactes de DOM/générateurs contrôlés",
  }),
);
