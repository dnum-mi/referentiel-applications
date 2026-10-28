import { describe, expect, it } from "vitest";
import merge from "../../patches/deepmerge";

const poisoned = () => JSON.parse('{"session":{"__proto__":{"admin":true}}}') as Record<string, unknown>;
const rootPoisoned = () => JSON.parse('{"__proto__":{"admin":true}}') as Record<string, unknown>;

function expectClean(result: Record<string, unknown>) {
  expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  expect(result.admin).toBeUndefined();
  expect(Object.hasOwn(result, "__proto__")).toBe(false);
  expect(Object.hasOwn(Object.prototype, "admin")).toBe(false);
}

describe("deepmerge — GHSA-gcqx-w48m-w2h4", () => {
  it.each([null, undefined, Object.create(null) as Record<string, unknown>])(
    "refuse le prototype injecté dans un emplacement %p",
    (session) => {
      const result = merge<Record<string, unknown>>({ session }, poisoned());
      expectClean(result.session as Record<string, unknown>);
    },
  );

  it("protège une cible racine sans prototype", () => {
    expectClean(merge<Record<string, unknown>>(Object.create(null), rootPoisoned()));
  });

  it("filtre une propriété __proto__ propre lors de la copie de la cible", () => {
    expectClean(merge<Record<string, unknown>>(rootPoisoned(), {}));
  });

  it("filtre aussi les clés de la cible imbriquée", () => {
    const result = merge<Record<string, unknown>>(poisoned(), {});
    expectClean(result.session as Record<string, unknown>);
  });

  it("protège merge.all et conserve les propriétés ordinaires", () => {
    const result = merge.all<Record<string, unknown>>([{ session: null }, poisoned(), { label: "App" }]);
    expectClean(result.session as Record<string, unknown>);
    expect(result.label).toBe("App");
  });

  it("conserve les tableaux, les symboles et les objets spéciaux", () => {
    const symbol = Symbol("option");
    const date = new Date("2026-10-28T00:00:00Z");
    const source = { list: [2], nested: { enabled: true }, date, [symbol]: "value" };
    const result = merge<typeof source>({ list: [1] }, source);
    expect(result.list).toEqual([1, 2]);
    expect(result.nested).toEqual({ enabled: true });
    expect(result.nested).not.toBe(source.nested);
    expect(result.date).toBe(date);
    expect(result[symbol]).toBe("value");
  });

  it("préserve clone:false et les options de fusion utilisées par les consommateurs", () => {
    const nested = { enabled: true };
    expect(merge<{ nested: typeof nested }>({}, { nested }, { clone: false }).nested).toBe(nested);
    expect(merge({ list: [1] }, { list: [2] }, { arrayMerge: (_target, source) => source })).toEqual({ list: [2] });
    expect(
      merge(
        { label: "App" },
        { label: "RefApp" },
        {
          customMerge: (key) => (key === "label" ? (_target: unknown, source: unknown) => source : undefined),
        },
      ),
    ).toEqual({ label: "RefApp" });
  });
});
