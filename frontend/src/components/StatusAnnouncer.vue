<script setup lang="ts">
import { ref, watchEffect, onBeforeUnmount } from "vue";

const props = defineProps<{
  id: string
  length: number
  queryLength: number
  minQueryLength: number
  selectedOption?: string
  selectedOptionIndex?: number
  validChoiceMade?: boolean
  isInFocus?: boolean
  tQueryTooShort: (min: number) => string
  tNoResults: () => string
  tSelectedOption: (sel: string, len: number, index: number) => string
  tResults: (len: number, contentSelected: string) => string
}>();

// Noms explicites
const statusSlotToggle = ref(false);
const isDebounced = ref(false);
const isSilenced = ref(false);
let debounceTimerId: ReturnType<typeof setTimeout> | undefined;

function buildLiveRegionMessage(): string {
  const selectedContent = props.selectedOption
    ? props.tSelectedOption(props.selectedOption, props.length, props.selectedOptionIndex ?? -1)
    : "";
  if (props.queryLength < props.minQueryLength) return props.tQueryTooShort(props.minQueryLength);
  if (props.length === 0) return props.tNoResults();
  return props.tResults(props.length, selectedContent);
}

watchEffect(() => {
  isDebounced.value = false;
  if (debounceTimerId) clearTimeout(debounceTimerId);
  debounceTimerId = setTimeout(() => {
    isSilenced.value = !props.isInFocus || !!props.validChoiceMade;
    isDebounced.value = true;
    statusSlotToggle.value = !statusSlotToggle.value;
  }, 1400);
});

onBeforeUnmount(() => {
  if (debounceTimerId) clearTimeout(debounceTimerId);
});
</script>

<template>
  <div class="fr-sr-only">
    <output :id="`${id}__status--A`" aria-live="polite" aria-atomic="true">
      {{ (!isSilenced && isDebounced && statusSlotToggle) ? buildLiveRegionMessage() : '' }}
    </output>
    <output :id="`${id}__status--B`" aria-live="polite" aria-atomic="true">
      {{ (!isSilenced && isDebounced && !statusSlotToggle) ? buildLiveRegionMessage() : '' }}
    </output>
  </div>
</template>
