<script setup lang="ts">
import { ref } from "vue";
import StatusAnnouncer from "./StatusAnnouncer.vue";
import { useAutocompleteSource } from "@/composables/use-autocomplete-source";
import { useComboboxA11y } from "@/composables/use-combobox-A11y";
import { useComboboxKeyboard } from "@/composables/use-combobox-keyboard";

const props = withDefaults(defineProps<{
  id: string
  source: any
  autoselect?: boolean
  cssNamespace?: string
  displayMenu?: "inline" | "overlay"
  minLength?: number
  name?: string
  placeholder?: string
  required?: boolean
  templates?: { inputValue?: (v: any) => string, suggestion?: (v: any) => string }
}>(), { autoselect: false, cssNamespace: "autocomplete", displayMenu: "inline", minLength: 0 });
const emit = defineEmits<{ (e: "confirm", payload: any): void, (e: "update:query", v: string): void }>();

const ROLE_COMBOBOX = "combobox";
const ROLE_LISTBOX = "listbox";
const ROLE_OPTION = "option";

const inputRef = ref<HTMLInputElement | null>(null);
const focused = ref<number | null>(null);

const { options, menuOpen, selected, query, setQuery, search, openAll, close }
  = useAutocompleteSource({
    source: props.source,
    minLength: props.minLength!,
    showAllValues: false,
  });

function focusInput() { inputRef.value?.focus(); }
function setFocused(focusedIndex: number | null) { focused.value = focusedIndex; }
function setSelected(selectedIndex: number) { selected.value = selectedIndex; }
function clear() {
  setQuery("");
  emit("update:query", "");
  setSelected(-1);
  close();
  focusInput();
}

defineExpose({ clear });

function submitSearch() {
  if (selected.value >= 0) {
    emit("confirm", options.value[selected.value]);
  } else {
    emit("confirm", query.value);
  }
}
function blurComponent() {
  close();
  setFocused(null);
}

const a11y = useComboboxA11y({
  id: props.id,
  cssNamespace: props.cssNamespace!,
  displayMenu: props.displayMenu!,
  inputClasses: null,
  hintClasses: null,
  menuClasses: null,
  showAllValues: false,
}, {
  focused,
  menuOpen,
});

const { onKeydown } = useComboboxKeyboard({
  menuOpen: () => menuOpen.value,
  optionsLen: () => options.value.length,
  focused: () => focused.value,
  selected: () => selected.value,
  query: () => query.value,
  setFocused,
  setSelected,
  openAll,
  search,
  close,
  submitSearch,
  selectAndConfirmAt,
  blurComponent,
  focusInput,
});

function onInput(inputEvent: Event) {
  const inputValue = (inputEvent.target as HTMLInputElement).value;
  setQuery(inputValue);
  emit("update:query", inputValue);
  search(inputValue);
}
function onFocus() { setFocused(-1); }
function onBlur() { blurComponent(); }

function inputValueOf(optionItem: any) {
  return props.templates?.inputValue ? props.templates.inputValue(optionItem) : String(optionItem ?? "");
}

function selectAndConfirmAt(optionIndex: number) {
  const selectedOption = options.value[optionIndex];
  const newQuery = props.templates?.inputValue
    ? props.templates.inputValue(selectedOption)
    : String(selectedOption ?? "");

  close();
  setQuery(newQuery);
  emit("update:query", newQuery);
  setSelected(-1);
  emit("confirm", selectedOption);
}
</script>

<template>
  <div class="container-bar fr-search-bar" role="search" data-testid="container-input">
    <label class="fr-label" :for="id" data-testid="autocomplete-label">Rechercher</label>

    <StatusAnnouncer
      :id="`${id}__status`"
      data-testid="autocomplete-status-announcer"
      :length="options.length"
      :query-length="query.length"
      :min-query-length="props.minLength ?? 0"
      :selected-option="selected >= 0 ? inputValueOf(options[selected]) : ''"
      :selected-option-index="selected >= 0 ? selected : -1"
      :valid-choice-made="false"
      :is-in-focus="focused !== null"
      :t-query-too-short="(m) => `Tapez ${m} caractères ou plus`"
      :t-no-results="() => 'Aucun résultat'"
      :t-selected-option="(s, l, i) => `${s} ${i + 1}/${l} sélectionné`"
      :t-results="(l, sel) => `${l} résultat(s). ${sel}`"
    />

    <div class="autocomplete" :style="null" data-testid="autocomplete-root">
      <input
        v-bind="a11y.ariaProps"
        :id="id"
        ref="inputRef" data-testid="autocomplete-input"
        class="fr-input" :class="[a11y.inputClassList]"
        type="search"
        :value="query"
        autocomplete="off"
        :placeholder="props.placeholder ?? ''"
        :role="ROLE_COMBOBOX"
        :aria-expanded="menuOpen ? 'true' : 'false'"
        :aria-controls="`${id}__listbox`"
        aria-haspopup="listbox"
        aria-autocomplete="list"
        :aria-activedescendant="(focused !== null && focused !== -1) ? `${id}__option--${focused}` : undefined"
        @keydown="onKeydown"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
      >

      <ul
        v-show="menuOpen && options.length > 0"
        v-bind="a11y.computedMenuAttributes"
        :id="`${id}__listbox`"
        data-testid="autocomplete-menu"
        class="autocomplete__menu" :class="[a11y.menuClassList]"
        :role="ROLE_LISTBOX"
        @mouseleave="() => setFocused(-1)"
      >
        <li
          v-for="(optionItem, optionIndex) in options"
          :id="`${id}__option--${optionIndex}`"
          :key="optionIndex"
          :role="ROLE_OPTION"
          data-testid="autocomplete-option"
          :aria-selected="focused === optionIndex ? 'true' : 'false'"
          tabindex="-1"
          @mousedown.prevent
          @click="() => selectAndConfirmAt(optionIndex)"
        >
          <span v-html="(templates?.suggestion ? templates.suggestion(optionItem) : String(optionItem))" />
        </li>
      </ul>
    </div>
  </div>
</template>

<style>
.container-bar {
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: flex-end;
}
.aa-search {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.autocomplete {
  --aa-width: 28rem;
  position: relative;
  width: min(var(--aa-width), 100%);
}

.autocomplete__menu {
  box-sizing: border-box;
  position: absolute;
}

.autocomplete .fr-input,
.autocomplete .autocomplete__input { width: 100%; }

.autocomplete .autocomplete__menu {
  list-style: none;
  margin: 0;
  padding: 0;
  background: white;
  border: 1px solid #dcdfe3;
  border-radius: .375rem;
  max-height: 18rem;
  overflow: auto;
  box-shadow: 0 6px 18px rgba(0,0,0,.08);
}

.autocomplete .autocomplete__menu--overlay {
  position: absolute;
  top: calc(100% + .25rem);
  left: 0;
  width: 100%;
  z-index: 1000;
}

.autocomplete .autocomplete__menu--hidden { display: none; }
.autocomplete .autocomplete__menu--visible { display: block; }

.autocomplete .autocomplete__menu li {
  padding: .5rem .75rem;
  cursor: pointer;
}
.autocomplete .autocomplete__menu li[aria-selected="true"],
.autocomplete .autocomplete__menu li:hover {
  background: #f3f4f6;
}
</style>
