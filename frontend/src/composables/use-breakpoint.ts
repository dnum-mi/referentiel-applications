import type { ComputedRef } from "vue";
import { computed, onBeforeUnmount, onMounted, reactive } from "vue";

type Breakpoints = Record<string, number | string>;
type Mode = "max" | "min";

interface ExtendedMediaQueryList extends MediaQueryList {
  addListener?: (callback: ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null) => void
  removeListener?: (callback: ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null) => void
}

export function useBreakpoints(breakpoints: Breakpoints, mode: Mode = "max") {
  const isClient = typeof window !== "undefined" && typeof window.matchMedia === "function";

  const matches = reactive<Record<string, boolean>>(
    Object.fromEntries(Object.keys(breakpoints).map(key => [key, false])),
  );

  const mqls: { mql: ExtendedMediaQueryList, listener: (e: MediaQueryListEvent) => void }[] = [];

  const toQuery = (v: number | string) => (typeof v === "number" ? `${v}px` : String(v));

  onMounted(() => {
    if (!isClient) return;

    Object.entries(breakpoints).forEach(([key, val]) => {
      const q = mode === "max" ? `(max-width: ${toQuery(val)})` : `(min-width: ${toQuery(val)})`;
      const mql = window.matchMedia(q) as ExtendedMediaQueryList;

      matches[key] = !!mql.matches;

      const listener = (e: MediaQueryListEvent) => {
        matches[key] = e.matches;
      };

      if (typeof mql.addEventListener === "function") {
        mql.addEventListener("change", listener);
      } else if (typeof mql.addListener === "function") {
        mql.addListener(listener);
      }

      mqls.push({ mql, listener });
    });
  });

  onBeforeUnmount(() => {
    mqls.forEach(({ mql, listener }) => {
      if (typeof mql.removeEventListener === "function") {
        mql.removeEventListener("change", listener);
      } else if (typeof mql.removeListener === "function") {
        mql.removeListener(listener);
      }
    });
  });

  const smaller = (key: string): ComputedRef<boolean> => computed(() => matches[key] ?? false);

  const larger = (key: string): ComputedRef<boolean> => computed(() => !(matches[key] ?? false));

  const current = (): ComputedRef<string[]> => computed(() =>
    Object.keys(matches).filter(k => !!matches[k]),
  );

  return {
    matches,
    is: matches,
    smaller,
    larger,
    current,
  };
}
