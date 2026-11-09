import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import Ajv, { AnySchema, ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PackageURL } from "packageurl-js";
import {
  ParsedSbom,
  SbomComponent,
  SbomComponentContext,
  SbomLimits,
  SbomRelation,
} from "./sbom.types";

// This plugin has no declaration file. Keep its untyped CommonJS boundary here.
const addInternationalFormats = createRequire(__filename)(
  "ajv-formats-draft2019",
) as (ajv: Ajv) => void;

type JsonObject = Record<string, unknown>;
const DEFAULT_LIMITS: SbomLimits = {
  maxBytes: 20 * 1024 * 1024,
  maxComponents: 50_000,
  maxRelations: 200_000,
};
const validators = new Map<string, ValidateFunction>();
const technologyNames: Record<string, string> = {
  application: "Application",
  framework: "Framework",
  library: "Bibliothèque",
  container: "Conteneur",
  platform: "Plateforme d’exécution",
  "operating-system": "Système d’exploitation",
  "device-driver": "Pilote",
  firmware: "Micrologiciel",
  file: "Fichier",
  service: "Service",
  device: "Matériel",
  data: "Données",
  "machine-learning-model": "Modèle d’apprentissage",
  "cryptographic-asset": "Composant cryptographique",
  snippet: "Extrait de code",
  package: "Paquet logiciel",
};

function object(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function requiredText(value: unknown, field: string): string {
  const result = text(value);
  if (!result) throw new BadRequestException(`Champ ${field} vide ou absent.`);
  return result;
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function canonical(value: unknown, sortArrays = true): string {
  if (Array.isArray(value)) {
    const elements = value.map((entry) => canonical(entry, sortArrays));
    return `[${(sortArrays ? elements.sort() : elements).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(object(value))
      .sort(([a], [b]) => compare(a, b))
      .map(
        ([key, child]) =>
          `${JSON.stringify(key)}:${canonical(child, sortArrays)}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function loadSchema(name: string): AnySchema {
  // All schema names are constants below, never paths supplied by the document.
  return JSON.parse(
    readFileSync(join(__dirname, "schemas", name), "utf8"),
  ) as AnySchema;
}

function validator(format: string, version: string): ValidateFunction {
  const key = `${format}:${version}`;
  const existing = validators.get(key);
  if (existing) return existing;
  // Upstream schemas use annotation keywords outside Ajv strict mode. Validation,
  // formats and additionalProperties remain enabled; no remote loader is installed.
  const ajv = new Ajv({
    strict: false,
    allErrors: false,
    validateFormats: true,
  });
  // Official uniqueItems semantics with a linear scan, avoiding quadratic deep
  // comparisons on inventories containing tens of thousands of components.
  ajv.removeKeyword("uniqueItems");
  ajv.addKeyword({
    keyword: "uniqueItems",
    type: "array",
    schemaType: "boolean",
    validate: (enabled: boolean, values: unknown[]) => {
      if (!enabled) return true;
      const seen = new Set<string>();
      for (const value of values) {
        const key = canonical(value, false);
        if (seen.has(key)) return false;
        seen.add(key);
      }
      return true;
    },
  });
  addFormats(ajv);
  addInternationalFormats(ajv);
  if (format === "CycloneDX") {
    ajv.addSchema(loadSchema(`cyclonedx-${version}-spdx.schema.json`));
    ajv.addSchema(loadSchema(`cyclonedx-${version}-jsf-0.82.schema.json`));
    if (version === "1.7") {
      ajv.addSchema(loadSchema("cyclonedx-1.7-cryptography-defs.schema.json"));
    }
  }
  const compiled = ajv.compile(
    loadSchema(
      format === "CycloneDX" ? `cyclonedx-${version}.json` : "spdx-2.3.json",
    ),
  );
  validators.set(key, compiled);
  return compiled;
}

function guardDepth(document: unknown): void {
  const pending = [{ value: document, depth: 0 }];
  const bomRefs = new Set<string>();
  while (pending.length) {
    const entry = pending.pop()!;
    if (entry.depth > 128) {
      throw new PayloadTooLargeException(
        "Le SBOM dépasse la profondeur maximale de 128 niveaux.",
      );
    }
    if (entry.value !== null && typeof entry.value === "object") {
      const bomRef = text(object(entry.value)["bom-ref"]);
      if (bomRef) {
        if (bomRefs.has(bomRef))
          throw new BadRequestException(
            `Référence interne dupliquée : ${bomRef}.`,
          );
        bomRefs.add(bomRef);
      }
      for (const value of Object.values(entry.value)) {
        if (value !== null && typeof value === "object") {
          pending.push({ value, depth: entry.depth + 1 });
        }
      }
    }
  }
}

function identify(
  ref: string,
  product: string,
  version: string | null,
  purl: string | null,
  type: string,
  warnings: Set<string>,
  context: SbomComponentContext = "inventory",
): SbomComponent {
  let normalizedPurl: string | null = null;
  let ecosystem: string | null = null;
  let effectiveVersion = version;
  if (purl) {
    try {
      const parsed = PackageURL.fromString(purl);
      normalizedPurl = parsed.toString();
      ecosystem = parsed.type;
      if (version && parsed.version && version !== parsed.version) {
        throw new BadRequestException(
          `Versions contradictoires entre le composant et son PURL : ${ref}.`,
        );
      }
      effectiveVersion ??= parsed.version || null;
    } catch (error: unknown) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`PURL invalide pour le composant ${ref}.`);
    }
  }
  const identificationStatus =
    normalizedPurl && effectiveVersion ? "identified" : "incomplete";
  if (identificationStatus === "incomplete") {
    warnings.add(
      `Identification incomplète : ${ref} (PURL ou version absent).`,
    );
  }
  return {
    context,
    ref,
    product,
    version: effectiveVersion,
    purl: normalizedPurl,
    ecosystem,
    type,
    technology: technologyNames[type] ?? "Autre composant",
    identificationStatus,
  };
}

class Inventory {
  readonly components: SbomComponent[] = [];
  readonly relations: SbomRelation[] = [];
  readonly warnings = new Set<string>();
  readonly refs = new Set<string>();
  private readonly generatedRefs = new Map<string, number>();

  constructor(readonly limits: SbomLimits) {}

  reference(explicit: string | null, seed: unknown): string {
    if (explicit) {
      this.register(explicit);
      return explicit;
    }
    const base = `refapp:anonymous:${digest(seed)}`;
    const occurrence = (this.generatedRefs.get(base) ?? 0) + 1;
    this.generatedRefs.set(base, occurrence);
    const ref = `${base}:${occurrence}`;
    this.register(ref);
    this.warnings.add(
      `Référence interne absente : identifiant local généré pour ${ref}.`,
    );
    return ref;
  }

  register(ref: string): void {
    if (this.refs.has(ref)) {
      throw new BadRequestException(`Référence interne dupliquée : ${ref}.`);
    }
    this.refs.add(ref);
  }

  add(component: SbomComponent): void {
    if (this.components.length >= this.limits.maxComponents) {
      throw new PayloadTooLargeException(
        `Le SBOM dépasse la limite de ${this.limits.maxComponents} composants.`,
      );
    }
    this.components.push(component);
  }

  relate(from: string, to: string, type: string): void {
    if (this.relations.length >= this.limits.maxRelations) {
      throw new PayloadTooLargeException(
        `Le SBOM dépasse la limite de ${this.limits.maxRelations} relations.`,
      );
    }
    this.relations.push({ from, to, type, resolved: false });
  }

  resolve(isExternal: (ref: string) => boolean): void {
    for (const relation of this.relations) {
      let resolved = true;
      for (const ref of [relation.from, relation.to]) {
        if (this.refs.has(ref)) continue;
        if (!isExternal(ref)) {
          throw new BadRequestException(
            `Référence interne introuvable : ${ref}.`,
          );
        }
        resolved = false;
        this.warnings.add(`Relation externe non résolue : ${ref}.`);
      }
      relation.resolved = resolved;
    }
  }
}

function isCycloneDxExternal(ref: string): boolean {
  return /^urn:cdx:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[1-9][0-9]*#.+$/i.test(
    ref,
  );
}

function parseCycloneDx(
  document: JsonObject,
  inventory: Inventory,
): string | null {
  type Pending = {
    value: unknown;
    kind: string;
    context: SbomComponentContext;
    parent?: string;
    relation?: string;
  };
  const pending: Pending[] = [];
  const enqueue = (
    values: unknown,
    kind: string,
    context: SbomComponentContext = "inventory",
    parent?: string,
    relation?: string,
  ) => {
    for (const value of array(values))
      pending.push({ value, kind, context, parent, relation });
  };
  enqueue(document.components, "component");
  enqueue(document.services, "service");
  const metadata = object(document.metadata);
  if (metadata.component)
    pending.push({
      value: metadata.component,
      kind: "component",
      context: "inventory",
    });
  const tools = object(metadata.tools);
  enqueue(tools.components, "component", "provenance");
  enqueue(tools.services, "service", "provenance");
  for (const formulaValue of array(document.formulation)) {
    const formula = object(formulaValue);
    enqueue(formula.components, "component", "provenance");
    enqueue(formula.services, "service", "provenance");
  }
  const targets = object(object(document.declarations).targets);
  enqueue(targets.components, "component", "provenance");
  enqueue(targets.services, "service", "provenance");
  for (const vulnerability of array(document.vulnerabilities)) {
    const vulnerabilityTools = object(object(vulnerability).tools);
    enqueue(vulnerabilityTools.components, "component", "provenance");
    enqueue(vulnerabilityTools.services, "service", "provenance");
  }
  for (const annotation of array(document.annotations)) {
    const annotator = object(object(annotation).annotator);
    if (annotator.component)
      pending.push({
        value: annotator.component,
        kind: "component",
        context: "provenance",
      });
    if (annotator.service)
      pending.push({
        value: annotator.service,
        kind: "service",
        context: "provenance",
      });
  }
  while (pending.length) {
    const entry = pending.pop()!;
    const component = object(entry.value);
    const context =
      entry.context === "excluded" || component.scope === "excluded"
        ? "excluded"
        : entry.context;
    const ref = inventory.reference(text(component["bom-ref"]), component);
    const type =
      entry.kind === "service"
        ? "service"
        : (text(component.type) ?? "package");
    const name = requiredText(component.name, "name");
    const group = text(component.group);
    inventory.add(
      identify(
        ref,
        group ? `${group}/${name}` : name,
        text(component.version),
        text(component.purl),
        type,
        inventory.warnings,
        context,
      ),
    );
    if (entry.parent)
      inventory.relate(entry.parent, ref, entry.relation ?? "CONTAINS");
    enqueue(component.components, "component", context, ref, "CONTAINS");
    enqueue(component.services, "service", context, ref, "CONTAINS");
    const pedigree = object(component.pedigree);
    enqueue(
      pedigree.ancestors,
      "component",
      context === "excluded" ? "excluded" : "provenance",
      ref,
      "ANCESTOR",
    );
    enqueue(
      pedigree.descendants,
      "component",
      context === "excluded" ? "excluded" : "provenance",
      ref,
      "DESCENDANT",
    );
    enqueue(
      pedigree.variants,
      "component",
      context === "excluded" ? "excluded" : "provenance",
      ref,
      "VARIANT",
    );
  }
  const excludedCount = inventory.components.filter(
    (component) => component.context === "excluded",
  ).length;
  const provenanceCount = inventory.components.filter(
    (component) => component.context === "provenance",
  ).length;
  if (excludedCount)
    inventory.warnings.add(
      `${excludedCount} composant(s) explicitement exclus, ou enfant(s) d’un composant exclu, sont conservés sans présence dans l’inventaire actif.`,
    );
  if (provenanceCount)
    inventory.warnings.add(
      `${provenanceCount} composant(s) de provenance (outils, historique ou annotations) sont conservés sans présence dans l’inventaire actif.`,
    );
  const declaredDependencies = new Set<string>();
  for (const dependencyValue of array(document.dependencies)) {
    const dependency = object(dependencyValue);
    const from = requiredText(dependency.ref, "ref");
    declaredDependencies.add(from);
    // Even a dependency with an empty dependsOn array must reference an existing node.
    if (!inventory.refs.has(from) && !isCycloneDxExternal(from)) {
      throw new BadRequestException(`Référence interne introuvable : ${from}.`);
    }
    for (const target of array(dependency.dependsOn)) {
      inventory.relate(from, requiredText(target, "dependsOn"), "DEPENDS_ON");
    }
    for (const target of array(dependency.provides)) {
      inventory.relate(from, requiredText(target, "provides"), "PROVIDES");
    }
  }
  if (!Array.isArray(document.dependencies)) {
    inventory.warnings.add(
      "Graphe de dépendances absent : les dépendances directes et transitives ne peuvent pas être déduites.",
    );
  }
  if (Array.isArray(document.dependencies)) {
    const missingDeclarations = inventory.components.filter(
      (component) =>
        component.context === "inventory" &&
        !declaredDependencies.has(component.ref),
    );
    if (missingDeclarations.length)
      inventory.warnings.add(
        `Graphe partiel : ${missingDeclarations.length} composant(s) sans déclaration de dépendances ; leur absence de dépendances n’est pas établie.`,
      );
  }
  inventory.resolve(isCycloneDxExternal);
  return text(object(metadata.component).version);
}

function parseSpdx(document: JsonObject, inventory: Inventory): string | null {
  const documentRef = requiredText(document.SPDXID, "SPDXID");
  inventory.register(documentRef);
  const externals = new Set(
    array(document.externalDocumentRefs).map((value) =>
      requiredText(object(value).externalDocumentId, "externalDocumentId"),
    ),
  );
  const packageVersions = new Map<string, string | null>();
  for (const packageValue of array(document.packages)) {
    const pkg = object(packageValue);
    const ref = inventory.reference(requiredText(pkg.SPDXID, "SPDXID"), pkg);
    const purls = array(pkg.externalRefs)
      .map(object)
      .filter((external) => external.referenceType === "purl")
      .map((external) =>
        requiredText(external.referenceLocator, "referenceLocator"),
      )
      .filter(Boolean);
    if (new Set(purls).size > 1) {
      throw new BadRequestException(
        `Plusieurs PURL contradictoires pour le composant ${ref}.`,
      );
    }
    const purpose =
      text(pkg.primaryPackagePurpose)?.toLowerCase().replaceAll("_", "-") ??
      "package";
    const component = identify(
      ref,
      requiredText(pkg.name, "name"),
      text(pkg.versionInfo),
      purls[0] ?? null,
      purpose,
      inventory.warnings,
    );
    inventory.add(component);
    packageVersions.set(ref, component.version);
    for (const file of array(pkg.hasFiles))
      inventory.relate(ref, requiredText(file, "hasFiles"), "CONTAINS");
  }
  for (const fileValue of array(document.files)) {
    const file = object(fileValue);
    const ref = inventory.reference(requiredText(file.SPDXID, "SPDXID"), file);
    inventory.add(
      identify(
        ref,
        requiredText(file.fileName, "fileName"),
        null,
        null,
        "file",
        inventory.warnings,
      ),
    );
    for (const target of array(file.fileDependencies))
      inventory.relate(
        ref,
        requiredText(target, "fileDependencies"),
        "DEPENDS_ON",
      );
  }
  for (const snippetValue of array(document.snippets)) {
    const snippet = object(snippetValue);
    const ref = inventory.reference(
      requiredText(snippet.SPDXID, "SPDXID"),
      snippet,
    );
    inventory.add(
      identify(
        ref,
        requiredText(snippet.name, "name"),
        null,
        null,
        "snippet",
        inventory.warnings,
      ),
    );
    inventory.relate(
      ref,
      requiredText(snippet.snippetFromFile, "snippetFromFile"),
      "GENERATED_FROM",
    );
  }
  const described = new Set<string>();
  for (const relationValue of array(document.relationships)) {
    const relation = object(relationValue);
    const from = requiredText(relation.spdxElementId, "spdxElementId");
    const to = requiredText(relation.relatedSpdxElement, "relatedSpdxElement");
    const type = requiredText(relation.relationshipType, "relationshipType");
    inventory.relate(from, to, type);
    if (from === documentRef && type === "DESCRIBES") described.add(to);
    if (to === documentRef && type === "DESCRIBED_BY") described.add(from);
  }
  for (const ref of array(document.documentDescribes)) {
    const target = requiredText(ref, "documentDescribes");
    described.add(target);
    inventory.relate(documentRef, target, "DESCRIBES");
  }
  inventory.resolve((ref) => {
    if (ref === "NONE" || ref === "NOASSERTION") return true;
    const split = ref.indexOf(":");
    return (
      split > 0 &&
      externals.has(ref.slice(0, split)) &&
      /^SPDXRef-.+/.test(ref.slice(split + 1))
    );
  });
  if (
    !array(document.relationships).some((value) =>
      /DEPEND/.test(String(object(value).relationshipType)),
    )
  ) {
    inventory.warnings.add(
      "Graphe de dépendances absent ou non renseigné : une liste de composants ne prouve pas leur relation directe ou transitive.",
    );
  }
  return described.size === 1
    ? (packageVersions.get([...described][0]) ?? null)
    : null;
}

/** Validate and normalize locally; no reference from the document is fetched. */
export function parseSbom(
  buffer: Buffer,
  limits: SbomLimits = DEFAULT_LIMITS,
): ParsedSbom {
  for (const value of Object.values(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0)
      throw new TypeError(
        "Les limites SBOM doivent être des entiers strictement positifs.",
      );
  }
  if (buffer.length > limits.maxBytes)
    throw new PayloadTooLargeException(
      `Le SBOM dépasse la limite de ${limits.maxBytes} octets.`,
    );
  let document: JsonObject;
  try {
    const parsed: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(buffer),
    );
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("Not an object");
    document = parsed as JsonObject;
  } catch {
    throw new BadRequestException(
      "Le fichier doit être un objet JSON valide encodé en UTF-8.",
    );
  }
  guardDepth(document);
  // Chaque branche produit des constantes : aucun nom de validateur ou de fichier
  // n'est choisi directement à partir d'une chaîne fournie dans le document.
  let format: "CycloneDX" | "SPDX";
  let specVersion: "1.5" | "1.6" | "1.7" | "2.3";
  if (document.bomFormat === "CycloneDX") {
    format = "CycloneDX";
    switch (document.specVersion) {
      case "1.5":
        specVersion = "1.5";
        break;
      case "1.6":
        specVersion = "1.6";
        break;
      case "1.7":
        specVersion = "1.7";
        break;
      default:
        throw new UnsupportedMediaTypeException(
          "Versions CycloneDX prises en charge : JSON 1.5, 1.6 et 1.7.",
        );
    }
  } else if (document.spdxVersion === "SPDX-2.3") {
    format = "SPDX";
    specVersion = "2.3";
  } else if (typeof document.spdxVersion === "string") {
    throw new UnsupportedMediaTypeException(
      "Version SPDX prise en charge : JSON 2.3.",
    );
  } else {
    throw new UnsupportedMediaTypeException(
      "Formats pris en charge : CycloneDX JSON 1.5/1.6/1.7 et SPDX JSON 2.3.",
    );
  }
  const validate = validator(format, specVersion);
  if (!validate(document)) {
    const error = validate.errors?.[0];
    throw new BadRequestException(
      `SBOM non conforme au schéma ${format} ${specVersion} : ${error?.instancePath || "/"} ${error?.message ?? "structure invalide"}.`,
    );
  }
  const inventory = new Inventory(limits);
  const projectVersion =
    format === "CycloneDX"
      ? parseCycloneDx(document, inventory)
      : parseSpdx(document, inventory);
  const components = inventory.components.sort((a, b) => compare(a.ref, b.ref));
  const relations = [
    ...new Map(
      inventory.relations.map((relation) => [canonical(relation), relation]),
    ).values(),
  ].sort((a, b) => compare(canonical(a), canonical(b)));
  const normalized = {
    format,
    specVersion,
    projectVersion,
    components,
    relations,
    warnings: [...inventory.warnings].sort(),
  };
  return {
    ...normalized,
    fingerprint: digest(normalized),
  };
}
