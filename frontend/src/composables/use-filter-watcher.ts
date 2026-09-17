import { unref } from "vue";
import { watchDebounced } from "@vueuse/core";

export function useFilterWatcher(filters: Record<string, unknown>, callback: () => void, keysToWatch?: string[]) {
  const keys = keysToWatch || Object.keys(filters);
  return watchDebounced(() => keys.map((key) => unref(filters[key])), callback, { deep: true, debounce: 300 });
}

export function filterEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v != null && v !== "")) as Partial<T>;
}
