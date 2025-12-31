// composables/useAccordionManager.ts
import { ref } from "vue";

export function useAccordionManager(totalSections: number, openAll = false) {
  const openAccordions = ref<number[]>(openAll ? Array.from({ length: totalSections }, (_, i) => i) : []);

  function toggle(index: number) {
    if (openAccordions.value.includes(index)) {
      openAccordions.value = openAccordions.value.filter((i) => i !== index);
    } else {
      openAccordions.value.push(index);
    }
  }

  function open(index: number) {
    if (!openAccordions.value.includes(index)) {
      openAccordions.value.push(index);
    }
  }

  function close(index: number) {
    openAccordions.value = openAccordions.value.filter((i) => i !== index);
  }

  function openAllSections() {
    openAccordions.value = Array.from({ length: totalSections }, (_, i) => i);
  }

  function closeAllSections() {
    openAccordions.value = [];
  }

  return {
    openAccordions,
    toggle,
    open,
    close,
    openAllSections,
    closeAllSections,
  };
}
