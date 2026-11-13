import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSbom } from "./sbom-parser";

type Document = Record<string, unknown>;
const fixture = (name: string): Document =>
  JSON.parse(
    readFileSync(join(__dirname, "fixtures", `${name}.json`), "utf8"),
  ) as Document;
const parse = (document: unknown) =>
  parseSbom(Buffer.from(JSON.stringify(document)));
const components = (document: Document) => document.components as Document[];
const dependencies = (document: Document) =>
  document.dependencies as Document[];

function minimalCdx(overrides: Document = {}): Document {
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.7",
    version: 1,
    components: [
      {
        type: "library",
        name: "test",
        "bom-ref": "test",
        version: "1.0.0",
        purl: "pkg:npm/test@1.0.0",
      },
    ],
    ...overrides,
  };
}

describe("parseSbom", () => {
  it.each(["1.5", "1.6", "1.7"])(
    "validates CycloneDX %s and preserves nested components and multiple versions",
    (version) => {
      const result = parse(fixture(`cyclonedx-${version}`));
      expect(result.format).toBe("CycloneDX");
      expect(result.specVersion).toBe(version);
      expect(result.projectVersion).toBe("1.0.0");
      expect(result.components.map((component) => component.ref)).toEqual([
        "accepts",
        "application",
        "express-4",
        "express-5",
      ]);
      expect(
        result.components
          .filter((component) => component.product === "express")
          .map((component) => component.version),
      ).toEqual(["4.21.0", "5.1.0"]);
      expect(result.relations).toEqual(
        expect.arrayContaining([
          {
            from: "express-4",
            to: "accepts",
            type: "CONTAINS",
            resolved: true,
          },
          {
            from: "express-4",
            to: "accepts",
            type: "DEPENDS_ON",
            resolved: true,
          },
        ]),
      );
    },
  );

  it("validates SPDX 2.3 and keeps document relationships", () => {
    const result = parse(fixture("spdx-2.3"));
    expect(result.format).toBe("SPDX");
    expect(result.specVersion).toBe("2.3");
    expect(result.projectVersion).toBe("1.0.0");
    expect(result.components).toHaveLength(3);
    expect(result.relations).toHaveLength(3);
    expect(result.relations.every((relation) => relation.resolved)).toBe(true);
  });

  it("rejects malformed JSON, non-objects and invalid UTF-8 with 400", () => {
    for (const bytes of [
      Buffer.from("{"),
      Buffer.from("[]"),
      Buffer.from("null"),
      Buffer.from([0xff]),
    ]) {
      expect(() => parseSbom(bytes)).toThrow(BadRequestException);
    }
  });

  it("rejects unsupported formats and versions with 415", () => {
    for (const value of [
      {},
      { bomFormat: "CycloneDX", specVersion: "1.4" },
      { spdxVersion: "SPDX-3.0" },
    ]) {
      expect(() => parse(value)).toThrow(UnsupportedMediaTypeException);
    }
  });

  it.each(["constructor", "__proto__", "toString", "../../schema"])(
    "rejects untrusted validator names %s before selecting a local schema",
    (version) => {
      expect(() => parse(minimalCdx({ specVersion: version }))).toThrow(
        UnsupportedMediaTypeException,
      );
      expect(() => parse({ spdxVersion: version })).toThrow(
        UnsupportedMediaTypeException,
      );
    },
  );

  it("enforces official schemas, including component requirements and offline license references", () => {
    expect(() =>
      parse(minimalCdx({ components: [{ type: "library", "bom-ref": "x" }] })),
    ).toThrow(BadRequestException);
    expect(() =>
      parse(minimalCdx({ components: [{ type: "invalid", name: "x" }] })),
    ).toThrow(BadRequestException);
    const document = minimalCdx();
    components(document)[0].licenses = [{ license: { id: "MIT" } }];
    expect(parse(document).components).toHaveLength(1);
    components(document)[0].licenses = [
      { license: { id: "not-an-SPDX-license" } },
    ];
    expect(() => parse(document)).toThrow(BadRequestException);
  });

  it("enforces schema uniqueness without relying on object property order", () => {
    const first = { type: "library", name: "same" };
    expect(() =>
      parse(
        minimalCdx({ components: [first, { name: "same", type: "library" }] }),
      ),
    ).toThrow(BadRequestException);
  });

  it("rejects duplicate internal IDs even across nested lists", () => {
    const document = fixture("cyclonedx-1.7");
    components(document)[1]["bom-ref"] = "accepts";
    expect(() => parse(document)).toThrow("Référence interne dupliquée");
  });

  it("rejects a bom-ref reused by a non-component element", () => {
    expect(() =>
      parse(
        minimalCdx({
          vulnerabilities: [{ "bom-ref": "test", id: "CVE-example" }],
        }),
      ),
    ).toThrow("Référence interne dupliquée");
  });

  it("rejects missing internal relation endpoints, including empty dependency declarations", () => {
    for (const dependsOn of [[], ["test"]]) {
      expect(() =>
        parse(minimalCdx({ dependencies: [{ ref: "missing", dependsOn }] })),
      ).toThrow(BadRequestException);
    }
    expect(() =>
      parse(
        minimalCdx({ dependencies: [{ ref: "test", dependsOn: ["missing"] }] }),
      ),
    ).toThrow(BadRequestException);
    const spdx = fixture("spdx-2.3");
    (spdx.relationships as Document[])[0].relatedSpdxElement =
      "SPDXRef-Missing";
    expect(() => parse(spdx)).toThrow(BadRequestException);
  });

  it("keeps external BOM links unresolved, without fetching them", () => {
    const external = "urn:cdx:3e671687-395b-41f5-a30f-a58921a69b79/1#external";
    const result = parse(
      minimalCdx({ dependencies: [{ ref: "test", dependsOn: [external] }] }),
    );
    expect(result.relations).toContainEqual({
      from: "test",
      to: external,
      type: "DEPENDS_ON",
      resolved: false,
    });
    expect(
      result.warnings.some((warning) =>
        warning.includes("externe non résolue"),
      ),
    ).toBe(true);
  });

  it("accepts only declared SPDX external document references", () => {
    const document = fixture("spdx-2.3");
    document.externalDocumentRefs = [
      {
        externalDocumentId: "DocumentRef-vendor",
        spdxDocument: "https://example.invalid/external",
        checksum: { algorithm: "SHA1", checksumValue: "0".repeat(40) },
      },
    ];
    (document.relationships as Document[]).push({
      spdxElementId: "SPDXRef-Express4",
      relationshipType: "DEPENDS_ON",
      relatedSpdxElement: "DocumentRef-vendor:SPDXRef-lib",
    });
    expect(
      parse(document).relations.some((relation) => !relation.resolved),
    ).toBe(true);
    document.externalDocumentRefs = [];
    expect(() => parse(document)).toThrow(BadRequestException);
  });

  it("keeps missing identity/version explicit and does not infer a database server from its client package", () => {
    const result = parse(
      minimalCdx({
        components: [{ type: "library", name: "pg", "bom-ref": "pg" }],
      }),
    );
    expect(result.components[0]).toMatchObject({
      product: "pg",
      type: "library",
      technology: "Bibliothèque",
      version: null,
      purl: null,
      ecosystem: null,
      identificationStatus: "incomplete",
    });
    expect(
      result.warnings.some((warning) =>
        warning.includes("Identification incomplète"),
      ),
    ).toBe(true);
  });

  it("normalizes PURLs and derives their version when explicit version is absent", () => {
    const document = minimalCdx({
      components: [
        {
          type: "library",
          name: "requests",
          "bom-ref": "requests",
          purl: "pkg:pypi/Requests@2.32.0",
        },
      ],
    });
    expect(parse(document).components[0]).toMatchObject({
      purl: "pkg:pypi/requests@2.32.0",
      ecosystem: "pypi",
      version: "2.32.0",
      identificationStatus: "identified",
    });
  });

  it("rejects invalid PURL and conflicting versions instead of silently reconciling them", () => {
    for (const purl of ["invalid", "pkg:npm/test@9.0.0"]) {
      const document = minimalCdx();
      components(document)[0].purl = purl;
      expect(() => parse(document)).toThrow(BadRequestException);
    }
  });

  it("preserves service and pedigree nodes with their distinct relationships", () => {
    const document = minimalCdx();
    components(document)[0].pedigree = {
      ancestors: [{ type: "library", name: "older", "bom-ref": "older" }],
    };
    document.services = [
      {
        "bom-ref": "api",
        name: "API",
        services: [{ "bom-ref": "sub-api", name: "Sub API" }],
      },
    ];
    document.dependencies = [
      { ref: "api", dependsOn: ["test"], provides: ["older"] },
    ];
    const result = parse(document);
    expect(result.components).toHaveLength(4);
    expect(result.relations).toEqual(
      expect.arrayContaining([
        { from: "test", to: "older", type: "ANCESTOR", resolved: true },
        { from: "api", to: "sub-api", type: "CONTAINS", resolved: true },
        { from: "api", to: "older", type: "PROVIDES", resolved: true },
      ]),
    );
  });

  it("separates tool and pedigree provenance from the active application inventory while preserving nodes and edges", () => {
    const document = minimalCdx();
    components(document)[0].pedigree = {
      ancestors: [
        {
          type: "library",
          name: "test",
          version: "0.9.0",
          purl: "pkg:npm/test@0.9.0",
          "bom-ref": "old-test",
          components: [
            { type: "library", name: "old-child", "bom-ref": "old-child" },
          ],
        },
      ],
      variants: [
        { type: "library", name: "alternative", "bom-ref": "alternative" },
      ],
    };
    document.metadata = {
      tools: {
        components: [
          {
            type: "application",
            name: "Scanner",
            "bom-ref": "scanner",
            components: [
              {
                type: "library",
                name: "Scanner engine",
                "bom-ref": "scanner-engine",
              },
            ],
          },
        ],
      },
    };
    document.formulation = [
      {
        "bom-ref": "build-formula",
        components: [
          { type: "application", name: "Builder", "bom-ref": "builder" },
        ],
      },
    ];
    document.dependencies = [{ ref: "scanner", dependsOn: ["scanner-engine"] }];
    const result = parse(document);
    expect(
      result.components
        .filter((component) => component.context === "inventory")
        .map((component) => component.ref),
    ).toEqual(["test"]);
    expect(
      result.components
        .filter((component) => component.context === "provenance")
        .map((component) => component.ref),
    ).toEqual([
      "alternative",
      "builder",
      "old-child",
      "old-test",
      "scanner",
      "scanner-engine",
    ]);
    expect(result.relations).toEqual(
      expect.arrayContaining([
        { from: "test", to: "old-test", type: "ANCESTOR", resolved: true },
        { from: "old-test", to: "old-child", type: "CONTAINS", resolved: true },
        {
          from: "scanner",
          to: "scanner-engine",
          type: "DEPENDS_ON",
          resolved: true,
        },
      ]),
    );
    expect(
      result.warnings.some((warning) =>
        warning.includes("6 composant(s) de provenance"),
      ),
    ).toBe(true);
  });

  it("preserves excluded nodes and inherits exclusion through nested component trees", () => {
    const document = minimalCdx({
      components: [
        {
          type: "application",
          name: "Current",
          "bom-ref": "current",
          components: [
            {
              type: "library",
              name: "Excluded child",
              "bom-ref": "excluded-child",
              scope: "excluded",
            },
          ],
        },
        {
          type: "library",
          name: "Excluded",
          "bom-ref": "excluded",
          scope: "excluded",
          components: [
            {
              type: "library",
              name: "Child",
              "bom-ref": "child",
              scope: "required",
            },
          ],
        },
      ],
      dependencies: [{ ref: "excluded", dependsOn: ["child"] }],
    });
    const result = parse(document);
    expect(
      result.components
        .filter((component) => component.context === "inventory")
        .map((component) => component.ref),
    ).toEqual(["current"]);
    expect(
      result.components
        .filter((component) => component.context === "excluded")
        .map((component) => component.ref),
    ).toEqual(["child", "excluded", "excluded-child"]);
    expect(result.relations).toContainEqual({
      from: "excluded",
      to: "child",
      type: "DEPENDS_ON",
      resolved: true,
    });
    expect(
      result.warnings.some((warning) =>
        warning.includes("3 composant(s) explicitement exclus"),
      ),
    ).toBe(true);
  });

  it("changes the fingerprint when a component becomes excluded or provenance-only", () => {
    const document = minimalCdx();
    const initial = parse(document);
    components(document)[0].scope = "excluded";
    const excluded = parse(document);
    expect(excluded.fingerprint).not.toBe(initial.fingerprint);
    delete components(document)[0].scope;
    const provenance = parse(
      minimalCdx({
        components: [],
        metadata: { tools: { components: components(document) } },
      }),
    );
    expect(provenance.components[0].context).toBe("provenance");
    expect(provenance.fingerprint).not.toBe(initial.fingerprint);
    expect(provenance.fingerprint).not.toBe(excluded.fingerprint);
  });

  it("preserves SPDX file relationships as first-class nodes", () => {
    const document = fixture("spdx-2.3");
    document.files = [
      {
        SPDXID: "SPDXRef-file",
        fileName: "index.js",
        checksums: [{ algorithm: "SHA1", checksumValue: "0".repeat(40) }],
      },
    ];
    (document.packages as Document[])[0].hasFiles = ["SPDXRef-file"];
    const result = parse(document);
    expect(
      result.components.find((component) => component.ref === "SPDXRef-file")
        ?.type,
    ).toBe("file");
    expect(result.relations).toContainEqual({
      from: "SPDXRef-Application",
      to: "SPDXRef-file",
      type: "CONTAINS",
      resolved: true,
    });
  });

  it("produces a semantic fingerprint independent of order, formatting and producer timestamp", () => {
    const document = fixture("cyclonedx-1.7");
    const original = parse(document);
    document.components = components(document).reverse();
    document.dependencies = dependencies(document).reverse();
    for (const dependency of dependencies(document))
      dependency.dependsOn = (dependency.dependsOn as string[]).reverse();
    (document.metadata as Document).timestamp = "2026-11-09T11:00:00Z";
    document.serialNumber = "urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79";
    expect(
      parseSbom(Buffer.from(JSON.stringify(document, null, 4))).fingerprint,
    ).toBe(original.fingerprint);
    components(document)[0].version = "5.2.0";
    components(document)[0].purl = "pkg:npm/express@5.2.0";
    expect(parse(document).fingerprint).not.toBe(original.fingerprint);
  });

  it("generates deterministic references for anonymous components regardless of order", () => {
    const document = minimalCdx({
      components: [
        { type: "library", name: "a" },
        { type: "library", name: "b" },
      ],
    });
    const original = parse(document);
    document.components = components(document).reverse();
    expect(parse(document).fingerprint).toBe(original.fingerprint);
    expect(
      original.components.every((component) =>
        component.ref.startsWith("refapp:anonymous:"),
      ),
    ).toBe(true);
  });

  it("applies configurable byte, component and relation limits with 413", () => {
    const bytes = Buffer.from(JSON.stringify(fixture("cyclonedx-1.7")));
    for (const limits of [
      { maxBytes: bytes.length - 1, maxComponents: 100, maxRelations: 100 },
      { maxBytes: bytes.length, maxComponents: 3, maxRelations: 100 },
      { maxBytes: bytes.length, maxComponents: 100, maxRelations: 3 },
    ]) {
      expect(() => parseSbom(bytes, limits)).toThrow(PayloadTooLargeException);
    }
    expect(
      parseSbom(bytes, {
        maxBytes: bytes.length,
        maxComponents: 4,
        maxRelations: 4,
      }).components,
    ).toHaveLength(4);
  });

  it("accepts the configured default byte, component and relation maxima simultaneously", () => {
    const count = 50_000;
    const document = {
      bomFormat: "CycloneDX",
      specVersion: "1.7",
      components: Array.from({ length: count }, (_, index) => ({
        type: "library",
        name: `package-${index}`,
        version: "1.0.0",
        purl: `pkg:npm/package-${index}@1.0.0`,
        "bom-ref": `component-${index}`,
      })),
      dependencies: Array.from({ length: count }, (_, index) => ({
        ref: `component-${index}`,
        dependsOn: [1, 2, 3, 4].map(
          (offset) => `component-${(index + offset) % count}`,
        ),
      })),
    };
    const json = Buffer.from(JSON.stringify(document));
    const buffer = Buffer.alloc(20 * 1024 * 1024, 0x20);
    expect(json.length).toBeLessThan(buffer.length);
    json.copy(buffer); // Trailing JSON whitespace reaches the exact byte limit.

    const result = parseSbom(buffer);

    expect(result.components).toHaveLength(50_000);
    expect(result.relations).toHaveLength(200_000);
    expect(result.warnings).toEqual([]);
    expect(result.relations.every((relation) => relation.resolved)).toBe(true);
    expect(result.relations).toContainEqual({
      from: "component-49999",
      to: "component-0",
      type: "DEPENDS_ON",
      resolved: true,
    });
  }, 30_000);

  it("bounds nesting before executing the recursive schema validator", () => {
    let component: Document = { type: "library", name: "leaf" };
    for (let i = 0; i < 130; i++)
      component = {
        type: "library",
        name: `level-${i}`,
        components: [component],
      };
    expect(() => parse(minimalCdx({ components: [component] }))).toThrow(
      PayloadTooLargeException,
    );
  });

  it("retains declaration targets and annotator components", () => {
    const document = minimalCdx({
      declarations: {
        targets: {
          components: [
            { type: "library", name: "target", "bom-ref": "target" },
          ],
        },
      },
      annotations: [
        {
          subjects: ["test"],
          annotator: {
            component: {
              type: "application",
              name: "scanner",
              "bom-ref": "scanner",
            },
          },
          timestamp: "2026-11-09T10:00:00Z",
          text: "test",
        },
      ],
    });
    const result = parse(document);
    expect(result.components.map((component) => component.ref)).toEqual([
      "scanner",
      "target",
      "test",
    ]);
    expect(
      result.components.map(({ ref, context }) => ({ ref, context })),
    ).toEqual([
      { ref: "scanner", context: "provenance" },
      { ref: "target", context: "provenance" },
      { ref: "test", context: "inventory" },
    ]);
  });

  it("includes graph completeness in the fingerprint", () => {
    const withoutGraph = parse(minimalCdx());
    const declaredEmptyGraph = parse(
      minimalCdx({ dependencies: [{ ref: "test", dependsOn: [] }] }),
    );
    expect(withoutGraph.fingerprint).not.toBe(declaredEmptyGraph.fingerprint);
    expect(
      parse(minimalCdx({ dependencies: [] })).warnings.some((warning) =>
        warning.includes("Graphe partiel"),
      ),
    ).toBe(true);
  });

  it("rejects blank required identifiers with a client error", () => {
    const document = fixture("spdx-2.3");
    (document.packages as Document[])[0].SPDXID = "";
    expect(() => parse(document)).toThrow(BadRequestException);
  });
});
