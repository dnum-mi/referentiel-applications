<script setup lang="ts">
import { onClickOutside, watchDebounced } from "@vueuse/core";
import { computed, nextTick, ref } from "vue";

interface Props<T> {
  id?: string;
  search: (query: string) => Promise<T[]>;
  displayLabel: (item: T | null) => string;
  placeholder?: string;
  displayNoResult?: boolean;
  /** Étiquette visible du champ (rendue en `title` — RGAA 11.1). */
  title?: string;
  /** Nom accessible de la liste de suggestions (`aria-label` du listbox — RGAA 7.1). */
  listLabel?: string;
  onChange?: (item: T | null) => void;
}

const props = defineProps<Props<any>>();
const emit = defineEmits(["onChange", "onInputValueChange", "close"]);

const inputValue = ref("");
const results = ref<any[]>([]);
const highlightedIndex = ref(-1);
const loading = ref(false);
const hasSearched = ref(false);
const showList = ref(false);
const inputEl = ref<HTMLInputElement | null>(null);
const containerEl = ref<HTMLElement | null>(null);

// Ids propres à l'instance : évite les collisions d'id d'options (et
// l'ambiguïté d'aria-activedescendant) si plusieurs autocomplete coexistent.
const optionIdPrefix = computed(() => props.id ?? "autocomplete");
const listId = computed(() => `${optionIdPrefix.value}-list`);
const optionId = (index: number) => `${optionIdPrefix.value}-item-${index}`;

// Compteur de requêtes : neutralise les réponses obsolètes / en désordre.
let latestRequestId = 0;

async function doSearch(query: string) {
  highlightedIndex.value = -1;
  if (!query) {
    latestRequestId++; // invalide toute réponse en vol
    results.value = [];
    hasSearched.value = false;
    loading.value = false;
    return;
  }
  const requestId = ++latestRequestId;
  loading.value = true;
  try {
    const searchResults = await props.search(query);
    if (requestId !== latestRequestId) return; // réponse obsolète : ignorée
    results.value = searchResults;
    hasSearched.value = true;
  } catch {
    if (requestId !== latestRequestId) return;
    results.value = [];
    hasSearched.value = true;
  } finally {
    if (requestId === latestRequestId) loading.value = false;
  }
}

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  inputValue.value = value;
  showList.value = true;
}

watchDebounced(
  inputValue,
  (newLabel) => {
    emit("onInputValueChange", newLabel);
    doSearch(newLabel);
  },
  { debounce: 300 },
);

function select(item: any) {
  // Affecter l'état AVANT les callbacks : si le consommateur vide le champ
  // (clear() depuis onChange), c'est son intention qui doit gagner en dernier.
  inputValue.value = props.displayLabel(item);
  showList.value = false;
  props.onChange?.(item);
  emit("onChange", item);
}

async function scrollHighlightedIntoView() {
  await nextTick();
  document.getElementById(optionId(highlightedIndex.value))?.scrollIntoView({ block: "nearest" });
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    // Liste déjà fermée : on remonte la demande de fermeture au parent
    // (ex. overlay de recherche mobile).
    if (showList.value) showList.value = false;
    else emit("close");
    return;
  }
  if (!showList.value) return;
  const count = results.value.length;
  const current = Number.isInteger(highlightedIndex.value) ? highlightedIndex.value : -1;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (!count) return;
    highlightedIndex.value = (current + 1) % count;
    scrollHighlightedIntoView();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (!count) return;
    highlightedIndex.value = (current - 1 + count) % count;
    scrollHighlightedIntoView();
  } else if (e.key === "Enter" && current >= 0 && current < count) {
    e.preventDefault();
    select(results.value[current]);
  }
}

function clear() {
  latestRequestId++; // invalide toute réponse en vol
  inputValue.value = "";
  results.value = [];
  highlightedIndex.value = -1;
  hasSearched.value = false;
  loading.value = false;
  showList.value = false;
}

function focus() {
  inputEl.value?.focus();
}
defineExpose({ clear, focus });

const hasResults = computed(() => results.value.length > 0);
// « Aucun résultat » uniquement après une recherche aboutie, hors chargement.
const showEmpty = computed(
  () => !!props.displayNoResult && !loading.value && hasSearched.value && inputValue.value.trim().length > 0 && !hasResults.value,
);

const ariaActiveDescendant = computed(() => {
  if (highlightedIndex.value >= 0 && showList.value) return optionId(highlightedIndex.value);
  return undefined;
});

const ariaDescribedById = computed(() => (props.id ? `${props.id}-helptext` : undefined));

const liveRegionText = computed(() => {
  if (!showList.value) return "";
  if (loading.value) return "Recherche en cours…";
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
      :id="id"
      ref="inputEl"
      type="text"
      class="fr-input"
      :placeholder="placeholder"
      :title="title"
      v-model="inputValue"
      @input="onInput"
      autocomplete="off"
      role="combobox"
      aria-autocomplete="list"
      :aria-controls="listId"
      :aria-activedescendant="ariaActiveDescendant"
      :aria-expanded="showList"
      :aria-describedby="ariaDescribedById"
    />
    <div v-if="id" :id="ariaDescribedById" class="visually-hidden">
      Utilisez les flèches haut et bas pour naviguer dans la liste, Entrée pour sélectionner.
    </div>

    <ul
      v-if="showList && (hasResults || showEmpty || loading)"
      :id="listId"
      class="autocomplete-list"
      role="listbox"
      :aria-label="listLabel ?? 'Suggestions'"
    >
      <li v-if="loading" class="autocomplete-status" role="presentation">Recherche en cours…</li>

      <template v-else>
        <li v-for="(item, index) in results" :key="index" role="presentation">
          <button
            type="button"
            class="autocomplete-item"
            :id="optionId(index)"
            :class="{ highlighted: index === highlightedIndex }"
            tabindex="-1"
            role="option"
            :aria-selected="index === highlightedIndex ? 'true' : 'false'"
            @click="select(item)"
          >
            <slot name="suggestion" :item="item">
              {{ props.displayLabel(item) }}
            </slot>
          </button>
        </li>

        <li v-if="showEmpty" class="no-result" role="presentation">Aucun résultat</li>
      </template>
    </ul>

    <div class="visually-hidden" aria-live="polite" aria-atomic="true">{{ liveRegionText }}</div>
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
  background: white;
  border: 1px solid #dcdcdc;
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
  background: #e5e7eb;
}
.no-result,
.autocomplete-status {
  padding: 0.5rem 0.75rem;
  color: #6b7280;
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
