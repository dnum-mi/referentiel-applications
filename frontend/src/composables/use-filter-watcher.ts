import { watch } from "vue";
import { useDebounceFn } from "@vueuse/core";

export function useFilterWatcher(filters: Record<string, unknown>, callback: () => void, keysToWatch?: string[]) {
  const debounced = useDebounceFn(callback, 300);
  const keys = keysToWatch || Object.keys(filters);

  keys.forEach((key) => {
    const value = filters[key];
    // Le filtre peut être un tableau nu ou une ref de tableau (`.value`).
    const isArray = Array.isArray(value) || Array.isArray((value as { value?: unknown } | null | undefined)?.value);

    watch(
      () => filters[key],
      () => {
        debounced();
      },
      { deep: isArray },
    );
  });
}

export function filterEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v != null && v !== "")) as Partial<T>;
}
