<script lang="ts" setup>
import type { ApplicationDto } from "@/client";
import { useAsyncSearch } from "@/composables/use-async-search";
import { generateId } from "@/utils/generator-utils";
import { watchDebounced } from "@vueuse/core";
import { computed, nextTick, ref, watch, type WatchHandle } from "vue";

const props = withDefaults(
  defineProps<{
    searchData?: Array<{ id: string; label: string }>;
    searchDataFunction?: (query: string) => Promise<Array<{ id: string; label: string }>>;
    label: string;
    placeholder: string;
    defaultValue?: string;
    tooltipContent?: string;
    searchErrorMessage?: string;
    /** Masque le tag de la sélection courante (utile en mode multi-sélection, géré par le parent). */
    hideSelectedTag?: boolean;
  }>(),
  {
    hideSelectedTag: false,
    searchErrorMessage: "Erreur lors de la recherche.",
  },
);

const emit = defineEmits<{
  "update:selectedValue": [application?: Pick<ApplicationDto, "id" | "label">];
  "update:isLoading": [isLoading: boolean];
}>();
const inputId = generateId("suggestions-input");
const inputElement = ref<HTMLInputElement>();
const listId = `${inputId}-list`;
const statusId = `${inputId}-status`;
const highlightedIndex = ref(-1);
const isOpen = ref(false);
const searchSuggestion = ref("");
const selectionAnnouncement = ref("");
const {
  results: suggestions,
  isLoading,
  error,
  hasSearched,
  onQuery,
  reset,
} = useAsyncSearch(
  (query) =>
    props.searchDataFunction?.(query) ??
    Promise.resolve(props.searchData?.filter((item) => item.label.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr"))) ?? []),
  {
    errorMessage: props.searchErrorMessage,
  },
);

const input = ref("");
const isListOpen = computed(() => isOpen.value && suggestions.value.length > 0);
const optionId = (index: number) => `${inputId}-option-${index}`;
const activeDescendant = computed(() =>
  isListOpen.value && highlightedIndex.value >= 0 && highlightedIndex.value < suggestions.value.length
    ? optionId(highlightedIndex.value)
    : undefined,
);
const statusText = computed(() => {
  if (selectionAnnouncement.value) return selectionAnnouncement.value;
  if (!isOpen.value) return "";
  if (isLoading.value) return "Recherche en cours…";
  if (!hasSearched.value || error.value) return "";
  const count = suggestions.value.length;
  if (!count) return "Aucun résultat.";
  const plural = count > 1 ? "s" : "";
  return `${count} suggestion${plural} disponible${plural}. Utilisez les flèches haut et bas, puis Entrée pour sélectionner.`;
});

function selectSuggestion(suggestion: Pick<ApplicationDto, "id" | "label">) {
  selectionAnnouncement.value = "";
  searchSuggestion.value = suggestion.label;
  emit("update:selectedValue", suggestion);
  reset();
  input.value = "";
  highlightedIndex.value = -1;
  isOpen.value = false;
  nextTick(() => inputElement.value?.focus());
}

watch(
  input,
  () => {
    selectionAnnouncement.value = "";
    reset();
    highlightedIndex.value = -1;
    isOpen.value = true;
  },
  { flush: "sync" },
);
watchDebounced(input, onQuery, { debounce: 300 });
watch(isLoading, (value) => emit("update:isLoading", value), { immediate: true });

let stop: WatchHandle;
stop = watchEffect(() => {
  if (!props.defaultValue) return;
  searchSuggestion.value = props.defaultValue;
  stop?.();
});

const resetInput = (selectionLabel = searchSuggestion.value) => {
  reset();
  input.value = "";
  searchSuggestion.value = "";
  highlightedIndex.value = -1;
  isOpen.value = false;
  selectionAnnouncement.value = selectionLabel ? `Sélection retirée : ${selectionLabel}.` : "";
  emit("update:selectedValue", undefined);
  nextTick(() => inputElement.value?.focus());
};

async function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && isOpen.value) {
    event.preventDefault();
    event.stopPropagation();
    isOpen.value = false;
    highlightedIndex.value = -1;
    return;
  }
  const count = suggestions.value.length;
  if (!count) return;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    isOpen.value = true;
    const direction = event.key === "ArrowDown" ? 1 : -1;
    if (highlightedIndex.value < 0) {
      highlightedIndex.value = direction > 0 ? 0 : count - 1;
    } else {
      highlightedIndex.value = (highlightedIndex.value + direction + count) % count;
    }
    await nextTick();
    document.getElementById(optionId(highlightedIndex.value))?.scrollIntoView({ block: "nearest" });
  } else if (event.key === "Enter" && isListOpen.value && highlightedIndex.value >= 0) {
    event.preventDefault();
    const suggestion = suggestions.value[highlightedIndex.value];
    if (suggestion) selectSuggestion(suggestion);
  }
}
</script>

<template>
  <div data-testid="suggestions-input">
    <label class="fr-label suggestions-input-label" :for="inputId">
      {{ props.label }}
      <DsfrTooltip
        v-if="props.tooltipContent"
        :id="`${inputId}-tooltip`"
        :aria-label="`Afficher l’aide sur ${props.label}`"
        :content="props.tooltipContent"
      />
    </label>
    <input
      :id="inputId"
      ref="inputElement"
      v-model="input"
      type="text"
      class="fr-input"
      role="combobox"
      autocomplete="off"
      aria-autocomplete="list"
      :aria-expanded="isListOpen"
      :aria-controls="isListOpen ? listId : undefined"
      :aria-activedescendant="activeDescendant"
      :placeholder="props.placeholder"
      :aria-describedby="props.tooltipContent ? `${inputId}-tooltip` : undefined"
      @keydown="onKeydown"
      @focus="isOpen = true"
      @blur="isOpen = false"
    />

    <div v-if="isLoading" data-testid="suggestions-loading">Chargement ...</div>
    <output :id="statusId" class="fr-sr-only" aria-atomic="true" aria-live="polite">{{ statusText }}</output>
    <p :class="error ? 'fr-error-text' : undefined" role="alert" aria-atomic="true">{{ error }}</p>
    <ul
      v-if="isListOpen"
      :id="listId"
      class="suggestions-list"
      role="listbox"
      :aria-label="`Suggestions pour ${label}`"
      data-testid="suggestions-list"
    >
      <li
        v-for="(suggestion, index) in suggestions"
        :key="suggestion.id"
        :id="optionId(index)"
        role="option"
        :aria-selected="index === highlightedIndex"
        class="suggestion-item"
        :class="{ highlighted: index === highlightedIndex }"
        :data-testid="`suggestion-item-${suggestion.id}`"
        @mousedown.prevent
        @click="selectSuggestion(suggestion)"
      >
        {{ suggestion.label }}
      </li>
    </ul>
    <slot name="application-label" :clear-selection="resetInput">
      <DsfrTag
        v-if="searchSuggestion && !props.hideSelectedTag"
        :label="searchSuggestion"
        :selected="false"
        :value="searchSuggestion"
        selectable
        style="margin-top: 15px"
        @select="resetInput()"
        class="fr-tag--dismiss"
      />
    </slot>
  </div>
</template>

<style scoped>
.suggestions-input-label {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.suggestions-list {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
  border: 1px solid var(--border-default-grey);
  background-color: var(--background-default-grey);
  color: var(--text-default-grey);
  max-height: 200px;
  overflow-y: auto;
}

.suggestion-item {
  padding: 0.5rem;
  cursor: pointer;
}

.suggestion-item:hover,
.suggestion-item.highlighted {
  background-color: var(--background-contrast-grey);
  outline: 2px solid var(--border-action-high-blue-france);
  outline-offset: -2px;
}
</style>
