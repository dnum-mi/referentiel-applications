<script setup lang="ts" generic="T">
import { onClickOutside, watchDebounced } from "@vueuse/core";
import { computed, nextTick, ref, useId, watch } from "vue";
import { useAsyncSearch } from "@/composables/use-async-search";

export interface Props<T> {
  id?: string;
  search: (query: string) => Promise<T[]>;
  displayLabel: (item: T) => string;
  placeholder?: string;
  displayNoResult?: boolean;
  /** Étiquette visible du champ (rendue en `title` — RGAA 11.1). */
  title?: string;
  /** Nom accessible de la liste de suggestions (`aria-label` du listbox — RGAA 7.1). */
  listLabel?: string;
  onChange?: (item: T) => void;
}

const props = defineProps<Props<T>>();
const emit = defineEmits(["onChange", "onInputValueChange", "close"]);

const inputValue = ref("");
const {
  results,
  isLoading: loading,
  error,
  hasSearched,
  onQuery,
  reset,
} = useAsyncSearch<T>((query) => props.search(query), { minLength: 1 });
const highlightedIndex = ref(-1);
const showList = ref(false);
const inputEl = ref<HTMLInputElement | null>(null);
const containerEl = ref<HTMLElement | null>(null);

// Ids propres à l'instance : évite les collisions d'id d'options (et
// l'ambiguïté d'aria-activedescendant) si plusieurs autocomplete coexistent.
const generatedId = `autocomplete-${useId()}`;
const optionIdPrefix = computed(() => props.id ?? generatedId);
const listId = computed(() => `${optionIdPrefix.value}-list`);
const optionId = (index: number) => `${optionIdPrefix.value}-item-${index}`;

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  inputValue.value = value;
  showList.value = true;
}

watch(
  inputValue,
  () => {
    reset();
    highlightedIndex.value = -1;
  },
  { flush: "sync" },
);
watchDebounced(
  inputValue,
  (newLabel) => {
    emit("onInputValueChange", newLabel);
    onQuery(newLabel);
  },
  { debounce: 300 },
);

function select(item: T) {
  // Affecter l'état AVANT les callbacks : si le consommateur vide le champ
  // (clear() depuis onChange), c'est son intention qui doit gagner en dernier.
  inputValue.value = props.displayLabel(item);
  showList.value = false;
  highlightedIndex.value = -1;
  props.onChange?.(item);
  emit("onChange", item);
  nextTick(() => inputEl.value?.focus());
}

async function scrollHighlightedIntoView() {
  await nextTick();
  document.getElementById(optionId(highlightedIndex.value))?.scrollIntoView({ block: "nearest" });
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    // Liste déjà fermée : on remonte la demande de fermeture au parent
    // (ex. overlay de recherche mobile).
    if (isPopupRendered.value) {
      e.preventDefault();
      e.stopPropagation();
      showList.value = false;
      highlightedIndex.value = -1;
    } else emit("close");
    return;
  }
  const count = results.value.length;
  const current = Number.isInteger(highlightedIndex.value) ? highlightedIndex.value : -1;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (!count) return;
    showList.value = true;
    highlightedIndex.value = (current + 1) % count;
    scrollHighlightedIntoView();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (!count) return;
    showList.value = true;
    highlightedIndex.value = current < 0 ? count - 1 : (current - 1 + count) % count;
    scrollHighlightedIntoView();
  } else if (e.key === "Enter" && isListRendered.value && current >= 0 && current < count) {
    e.preventDefault();
    select(results.value[current]);
  }
}

function clear() {
  reset();
  inputValue.value = "";
  highlightedIndex.value = -1;
  showList.value = false;
}

function focus() {
  inputEl.value?.focus();
}
defineExpose({ clear, focus });

const hasResults = computed(() => results.value.length > 0);
// « Aucun résultat » uniquement après une recherche aboutie, hors chargement.
const showEmpty = computed(
  () =>
    !!props.displayNoResult &&
    !error.value &&
    !loading.value &&
    hasSearched.value &&
    inputValue.value.trim().length > 0 &&
    !hasResults.value,
);

// La liste n'est rendue que si elle a un contenu : aria-expanded / aria-controls
// doivent refléter ce rendu réel, pas seulement l'intention d'ouverture.
const isPopupRendered = computed(() => showList.value && (hasResults.value || showEmpty.value || loading.value || !!error.value));
const isListRendered = computed(() => showList.value && hasResults.value && !loading.value && !error.value);

const ariaActiveDescendant = computed(() => {
  if (highlightedIndex.value >= 0 && highlightedIndex.value < results.value.length && isListRendered.value)
    return optionId(highlightedIndex.value);
  return undefined;
});

const ariaDescribedById = computed(() => `${optionIdPrefix.value}-helptext`);

const liveRegionText = computed(() => {
  if (!showList.value) return "";
  if (loading.value) return "Recherche en cours…";
  if (error.value) return "";
  if (!hasSearched.value) return "";
  if (results.value.length === 0) return props.displayNoResult ? "Aucun résultat" : "";
  const n = results.value.length;
  return `${n} suggestion${n > 1 ? "s" : ""} disponible${n > 1 ? "s" : ""}, utilisez les flèches haut et bas pour naviguer, Entrée pour sélectionner.`;
});

onClickOutside(containerEl, () => {
  showList.value = false;
});
</script>

<template>
  <div ref="containerEl" class="autocomplete" @keydown="onKeydown">
    <input
      :id="optionIdPrefix"
      ref="inputEl"
      type="text"
      class="fr-input"
      :placeholder="placeholder"
      :title="title"
      v-model="inputValue"
      @input="onInput"
      @blur="showList = false"
      autocomplete="off"
      role="combobox"
      aria-autocomplete="list"
      :aria-controls="isListRendered ? listId : undefined"
      :aria-activedescendant="ariaActiveDescendant"
      :aria-expanded="isListRendered"
      :aria-describedby="ariaDescribedById"
    />
    <div :id="ariaDescribedById" class="visually-hidden">
      Utilisez les flèches haut et bas pour naviguer dans la liste, Entrée pour sélectionner.
    </div>

    <ul v-if="isListRendered" :id="listId" class="autocomplete-list" role="listbox" :aria-label="listLabel ?? 'Suggestions'">
      <li v-for="(item, index) in results" :key="index" role="presentation">
        <button
          type="button"
          class="autocomplete-item"
          :id="optionId(index)"
          :class="{ highlighted: index === highlightedIndex }"
          tabindex="-1"
          role="option"
          :aria-selected="index === highlightedIndex ? 'true' : 'false'"
          @mousedown.prevent
          @click="select(item)"
        >
          <slot name="suggestion" :item="item">
            {{ props.displayLabel(item) }}
          </slot>
        </button>
      </li>
    </ul>

    <div v-else-if="isPopupRendered" class="autocomplete-list">
      <p v-if="loading" class="autocomplete-status">Recherche en cours…</p>
      <p v-else-if="showEmpty" class="no-result">Aucun résultat</p>
      <p v-else-if="error" class="no-result">{{ error }}</p>
    </div>

    <div class="visually-hidden" role="status" aria-atomic="true">{{ liveRegionText }}</div>
    <div class="visually-hidden" role="alert" aria-atomic="true">{{ showList && error ? error : "" }}</div>
  </div>
</template>

<style scoped>
.autocomplete {
  position: relative;
}
.fr-input {
  width: 100%;
}
.autocomplete-list {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 10;
  width: 100%;
  background: var(--background-default-grey);
  color: var(--text-default-grey);
  border: 1px solid var(--border-default-grey);
  border-radius: 0 0 0.5rem 0.5rem;
  max-height: 18rem;
  overflow-y: auto;
}
.autocomplete-item {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  text-align: left;
  font: inherit;
  color: inherit;
  background: none;
  border: 0;
  border-radius: 0;
  cursor: pointer;
}
.autocomplete-item.highlighted,
.autocomplete-item:hover {
  background: var(--background-contrast-grey);
  outline: 2px solid var(--border-action-high-blue-france);
  outline-offset: -2px;
}
.no-result,
.autocomplete-status {
  padding: 0.5rem 0.75rem;
  color: var(--text-mention-grey);
}
.visually-hidden {
  position: absolute !important;
  height: 1px;
  width: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap;
  border: 0;
  padding: 0;
  margin: -1px;
}
</style>
