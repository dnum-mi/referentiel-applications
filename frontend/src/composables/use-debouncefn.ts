import { ref } from "vue";

export function useDebouncedFn<T extends (...args: any[]) => void>(fn: T, delay = 300) {
  const timeout = ref<ReturnType<typeof setTimeout> | null>(null);

  function run(...args: Parameters<T>) {
    if (timeout.value) clearTimeout(timeout.value);
    timeout.value = setTimeout(() => {
      fn(...args);
    }, delay);
  }

  return {
    run,
    cancel: () => timeout.value && clearTimeout(timeout.value),
  };
}
