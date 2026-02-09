<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";

interface Props<T> {
  id?: string;
  search: (query: string) => Promise<T[]>;
  displayLabel: (item: T | null) => string;
  placeholder?: string;
  displayNoResult?: boolean;
  isSearch?: boolean;
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

async function doSearch(query: string) {
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
  emit("onInputValueChange", value);
  doSearch(value);
  showList.value = true;
}

function select(item: any) {
  props.onChange?.(item);
  emit("onChange", item);
  inputValue.value = props.displayLabel(item);
  showList.value = false;
}

function onKeydown(e: KeyboardEvent) {
  if (!showList.value) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    highlightedIndex.value = (highlightedIndex.value + 1) % results.value.length;
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    highlightedIndex.value = (highlightedIndex.value - 1 + results.value.length) % results.value.length;
  } else if (e.key === "Enter" && highlightedIndex.value >= 0) {
    e.preventDefault();
    select(results.value[highlightedIndex.value]);
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
defineExpose({ clear });

onMounted(() => {
  if (props.isSearch) inputEl.value?.setAttribute("role", "searchbox");
});

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
  return `${results.value.length} résultat${results.value.length > 1 ? "s" : ""} disponible${results.value.length > 1 ? "s" : ""}`;
});
</script>

<template>
  <div class="autocomplete" @keydown="onKeydown">
    <input
      :id="id"
      ref="inputEl"
      type="text"
      class="fr-input"
      :placeholder="placeholder"
      v-model="inputValue"
      @input="onInput"
      autocomplete="off"
      role="combobox"
      :aria-controls="id ? id + '-list' : 'autocomplete-list'"
      :aria-activedescendant="ariaActiveDescendant"
      :aria-expanded="showList.toString()"
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
    >
      <li
        v-for="(item, index) in results"
        :key="index"
        class="autocomplete-item"
        :id="`autocomplete-item-${index}`"
        :class="{ highlighted: index === highlightedIndex }"
        @mousedown.prevent="select(item)"
        role="option"
        :aria-selected="index === highlightedIndex ? 'true' : 'false'"
      >
        <slot name="suggestion" :item="item">
          {{ props.displayLabel(item) }}
        </slot>
      </li>

      <li v-if="!hasResults && displayNoResult" class="no-result" role="option" aria-disabled="true">Aucun résultat</li>
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
  padding: 0.5rem 0.75rem;
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
