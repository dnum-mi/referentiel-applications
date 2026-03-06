import { onMounted, onUnmounted, type Ref } from "vue";

export function useClickOutside(target: Ref<HTMLElement | null>, callback: () => void) {
  function handler(event: MouseEvent) {
    if (target.value && event.target instanceof Node && !target.value.contains(event.target)) {
      callback();
    }
  }

  onMounted(() => document.addEventListener("click", handler));
  onUnmounted(() => document.removeEventListener("click", handler));
}
