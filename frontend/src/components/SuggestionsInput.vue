<script lang="ts" setup>
import { ref, watch, defineEmits, onBeforeMount } from "vue";

const props = defineProps({
  searchData: {
    type: Array,
    required: false,
    default: () => [],
  },
  searchDataFunction: {
    type: Function,
    required: false,
  },
  returnData: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    default: "Suggestions",
  },
  placeholder: {
    type: String,
    default: "Tapez au moins 3 caractères",
  },
});

const emit = defineEmits(["update:returnData"]);

const searchSuggestion = ref("");
const isLoading = ref(false);
const suggestions = ref([]);
const defaultData = ref(props.returnData);

function selectSuggestion(suggestion: any) {
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

onBeforeMount(() => {
  if (defaultData.value) {
    const foundSuggestion = (props.searchData || []).find((sug) => sug.id === defaultData.value);
    if (foundSuggestion) {
      searchSuggestion.value = foundSuggestion.label;
    }
  }
});
</script>

<template>
  <div>
    <label class="fr-label">{{ props.label }}</label>
    <DsfrInput :label="props.label" v-model="searchSuggestion" :placeholder="props.placeholder" />

    <div v-if="isLoading">Chargement ...</div>

    <ul v-if="suggestions.length" class="suggestions-list">
      <li v-for="suggestion in suggestions" :key="suggestion.id" class="suggestion-item" @click="selectSuggestion(suggestion)">
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
