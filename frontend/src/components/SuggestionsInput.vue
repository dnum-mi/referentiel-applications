<script lang="ts" setup>
import type { ApplicationDto } from "@/client";
import { useAsyncSearch } from "@/composables/use-async-search";
import { generateId } from "@/utils/generator-utils";
import { watchDebounced } from "@vueuse/core";
import { ref, watch, type WatchHandle } from "vue";

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
const searchSuggestion = ref("");
const {
  results: suggestions,
  isLoading,
  error,
  onQuery,
  reset,
} = useAsyncSearch((query) => props.searchDataFunction?.(query) ?? Promise.resolve([]), {
  errorMessage: props.searchErrorMessage,
});

const input = ref("");

function selectSuggestion(suggestion: Pick<ApplicationDto, "id" | "label">) {
  searchSuggestion.value = suggestion.label;
  emit("update:selectedValue", suggestion);
  reset();
  input.value = "";
}

watch(input, () => reset(), { flush: "sync" });
watchDebounced(input, onQuery, { debounce: 300 });
watch(isLoading, (value) => emit("update:isLoading", value), { immediate: true });

let stop: WatchHandle;
stop = watchEffect(() => {
  if (!props.defaultValue) return;
  searchSuggestion.value = props.defaultValue;
  stop?.();
});

const resetInput = () => {
  reset();
  input.value = "";
  searchSuggestion.value = "";
  emit("update:selectedValue", undefined);
};
</script>

<template>
  <div data-testid="suggestions-input">
    <label class="fr-label suggestions-input-label" :for="inputId">
      {{ props.label }}
      <DsfrTooltip v-if="props.tooltipContent" :id="`${inputId}-tooltip`" :content="props.tooltipContent" />
    </label>
    <DsfrInput
      :id="inputId"
      v-model="input"
      :label="props.label"
      :placeholder="props.placeholder"
      :aria-describedby="props.tooltipContent ? `${inputId}-tooltip` : undefined"
    />

    <div v-if="isLoading" data-testid="suggestions-loading">Chargement ...</div>
    <p v-if="error" class="fr-error-text" role="alert">{{ error }}</p>
    <ul v-if="suggestions.length" class="suggestions-list" data-testid="suggestions-list">
      <li
        v-for="suggestion in suggestions"
        :key="suggestion.id"
        class="suggestion-item"
        :data-testid="`suggestion-item-${suggestion.id}`"
        @click="selectSuggestion(suggestion)"
      >
        {{ suggestion.label }}
      </li>
    </ul>
    <slot name="application-label">
      <DsfrTag
        v-if="searchSuggestion && !props.hideSelectedTag"
        :label="searchSuggestion"
        :selected="false"
        :value="searchSuggestion"
        selectable
        style="margin-top: 15px"
        @select="resetInput"
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
  border: 1px solid #ccc;
  max-height: 200px;
  overflow-y: auto;
}

.suggestion-item {
  padding: 0.5rem;
  cursor: pointer;
}

.suggestion-item:hover {
  background-color: #f0f0f0;
}
</style>
