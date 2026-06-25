<script setup lang="ts">
import { watchDebounced } from "@vueuse/core";
import { onClickOutside } from "@vueuse/core";
import { computed, ref } from "vue";

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
const emit = defineEmits(["onChange", "onInputValueChange"]);

const inputValue = ref("");
const results = ref<any[]>([]);
const highlightedIndex = ref(-1);
const loading = ref(false);
const showList = ref(false);
const inputEl = ref<HTMLInputElement | null>(null);
const containerEl = ref<HTMLElement | null>(null);

async function doSearch(query: string) {
  highlightedIndex.value = -1;
  if (!query) {
    results.value = [];
    return;
  }
  loading.value = true;
  try {
    const searchResults = await props.search(query);
    results.value = searchResults;
  } finally {
    loading.value = false;
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
  props.onChange?.(item);
  emit("onChange", item);
  inputValue.value = props.displayLabel(item);
  showList.value = false;
}

function onKeydown(e: KeyboardEvent) {
  if (!showList.value) return;
  const count = results.value.length;
  const current = Number.isInteger(highlightedIndex.value) ? highlightedIndex.value : -1;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (!count) return;
    highlightedIndex.value = (current + 1) % count;
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (!count) return;
    highlightedIndex.value = (current - 1 + count) % count;
  } else if (e.key === "Enter" && current >= 0 && current < count) {
    e.preventDefault();
    select(results.value[current]);
  } else if (e.key === "Escape") {
    showList.value = false;
  }
}

function clear() {
  inputValue.value = "";
  results.value = [];
  highlightedIndex.value = -1;
  showList.value = false;
}

function focus() {
  inputEl.value?.focus();
}
defineExpose({ clear, focus });

const hasResults = computed(() => results.value.length > 0);

const ariaActiveDescendant = computed(() => {
  if (highlightedIndex.value >= 0 && showList.value) {
    return `autocomplete-item-${highlightedIndex.value}`;
  }
  return undefined;
});

const ariaDescribedById = computed(() => {
  return props.id ? `${props.id}-helptext` : undefined;
});

const liveRegionText = computed(() => {
  if (!showList.value) return "";
  if (results.value.length === 0) {
    return props.displayNoResult ? "Aucun résultat" : "";
  }
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
      :aria-controls="id ? id + '-list' : 'autocomplete-list'"
      :aria-activedescendant="ariaActiveDescendant"
      :aria-expanded="showList"
      :aria-describedby="ariaDescribedById"
    />
    <div v-if="id" :id="ariaDescribedById" class="visually-hidden">
      Utilisez les flèches haut et bas pour naviguer dans la liste, Entrée pour sélectionner.
    </div>

    <ul
      v-if="showList && (hasResults || displayNoResult)"
      :id="id ? id + '-list' : 'autocomplete-list'"
      class="autocomplete-list"
      role="listbox"
      :aria-label="listLabel ?? 'Suggestions'"
    >
      <li v-for="(item, index) in results" :key="index" role="presentation">
        <button
          type="button"
          class="autocomplete-item"
          :id="`autocomplete-item-${index}`"
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

      <li v-if="!hasResults && displayNoResult" class="no-result" role="option" :aria-selected="false" aria-disabled="true">
        Aucun résultat
      </li>
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
.no-result {
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
