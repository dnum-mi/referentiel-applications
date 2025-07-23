import { watch } from "vue";
import { useDebouncedFn } from "@/composables/use-debouncefn";

export function useFilterWatcher(filters: Record<string, any>, callback: () => void, keysToWatch?: string[]) {
  const debounced = useDebouncedFn(callback, 300);
  const keys = keysToWatch || Object.keys(filters);

  keys.forEach((key) => {
    const isArray = Array.isArray(filters[key]) || Array.isArray(filters[key]?.value);

    watch(
      () => filters[key],
      () => {
        debounced.run();
      },
      { deep: isArray },
    );
  });
}

export function filterEmpty<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v != null && v !== "")) as Partial<T>;
}
