<script lang="ts" setup>
import { generateId } from "@/utils/generator-utils";
import { ref, watch, defineEmits, onBeforeMount } from "vue";

const props = defineProps<{
  searchData?: Array<{ id: string; label: string }>;
  searchDataFunction?: (query: string) => Promise<Array<{ id: string; label: string }>>;
  returnData: string;
  label: string;
  placeholder: string;
}>();

const emit = defineEmits(["update:returnData"]);
const inputId = generateId("suggestions-input");
const searchSuggestion = ref("");
const isLoading = ref(false);
const suggestions = ref<Array<{ id: string; label: string }>>([]);
const defaultData = ref(props.returnData);

function selectSuggestion(suggestion: { id: string; label: string }) {
  searchSuggestion.value = suggestion.label;
  emit("update:returnData", suggestion.id);
  suggestions.value = [];
}

watch(searchSuggestion, (newValue) => {
  if (newValue.length >= 3) {
    isLoading.value = true;
    if (props.searchDataFunction) {
      props.searchDataFunction(newValue).then((data) => {
        suggestions.value = data;
        isLoading.value = false;
      });
    } else {
      suggestions.value = (props.searchData || []).filter((sug) => sug?.label?.toLowerCase().includes(newValue.toLowerCase()));
      isLoading.value = false;
    }
  } else {
    suggestions.value = [];
  }
});

watch(
  () => props.returnData,
  (newValue) => {
    defaultData.value = newValue;
    const foundSuggestion = (props.searchData || []).find((sug) => sug.id === newValue);
    searchSuggestion.value = foundSuggestion?.label ?? "";
  },
);

onBeforeMount(() => {
  if (defaultData.value) {
    const foundSuggestion = (props.searchData || []).find((sug) => sug.id === defaultData.value);
    foundSuggestion ? (searchSuggestion.value = foundSuggestion.label) : (searchSuggestion.value = "");
  }
});
</script>

<template>
  <div data-testid="suggestions-input">
    <label class="fr-label" :for="inputId">{{ props.label }}</label>
    <DsfrInput :id="inputId" v-model="searchSuggestion" :label="props.label" :placeholder="props.placeholder" />

    <div v-if="isLoading" data-testid="suggestions-loading">Chargement ...</div>

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
  </div>
</template>

<style scoped>
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
