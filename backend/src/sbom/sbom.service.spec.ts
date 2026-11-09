import { compareComponents } from "./sbom.service";
import type { SbomComponent } from "./sbom.types";

function component(version: string, ref = version): SbomComponent {
  return {
    ref,
    context: "inventory",
    product: "sample",
    version,
    purl: "pkg:npm/sample@" + version,
    ecosystem: "npm",
    type: "library",
    technology: "Bibliothèque",
    identificationStatus: "identified",
  };
}

describe("SBOM multiversion change preview", () => {
  it("distinguishes a version replacement from a retained coexisting version", () => {
    const result = compareComponents(
      [component("1"), component("2")],
      [component("2"), component("3")],
    );
    expect(result).toEqual({
      added: [],
      removed: [],
      unchanged: 1,
      changed: [
        {
          before: { ref: "1", product: "sample", version: "1" },
          after: { ref: "3", product: "sample", version: "3" },
        },
      ],
    });
  });

  it("preserves repeated occurrences and detects only the missing occurrence", () => {
    const result = compareComponents(
      [component("1", "a"), component("1", "b")],
      [component("1", "c")],
    );
    expect(result.unchanged).toBe(1);
    expect(result.removed).toHaveLength(1);
    expect(result.changed).toEqual([]);
  });

  it("does not confuse same names in different ecosystems", () => {
    const original = component("1");
    const different = {
      ...original,
      purl: "pkg:pypi/sample@2",
      ecosystem: "pypi",
      version: "2",
    };
    const result = compareComponents([original], [different]);
    expect(result.changed).toEqual([]);
    expect(result.added).toHaveLength(1);
    expect(result.removed).toHaveLength(1);
  });

  it("handles the advertised component boundary without quadratic array scans", () => {
    const before = Array.from({ length: 50_000 }, (_, index) =>
      component(String(index)),
    );
    const after = [...before].reverse();
    const start = performance.now();
    const result = compareComponents(before, after);
    expect(result).toEqual({
      added: [],
      removed: [],
      changed: [],
      unchanged: 50_000,
    });
    expect(performance.now() - start).toBeLessThan(10_000);
  });
});
