<script lang="ts" setup>
import type { ApplicationDto } from "@/client";
import { generateId } from "@/utils/generator-utils";
import { ref, watch } from "vue";

const props = defineProps<{
  searchData?: Array<{ id: string; label: string }>;
  searchDataFunction?: (query: string) => Promise<Array<{ id: string; label: string }>>;
  label: string;
  placeholder: string;
}>();

const emit = defineEmits<{
  "update:selectedValue": [application?: Pick<ApplicationDto, "id" | "label">];
}>();
const inputId = generateId("suggestions-input");
const searchSuggestion = ref("");
const isLoading = ref(false);
const suggestions = ref<Array<{ id: string; label: string }>>([]);

const input = ref("");

function selectSuggestion(suggestion: Pick<ApplicationDto, "id" | "label">) {
  searchSuggestion.value = suggestion.label;
  emit("update:selectedValue", suggestion);
  suggestions.value = [];
  input.value = "";
}

watch(input, (newValue) => {
  isLoading.value = true;
  if (props.searchDataFunction) {
    props
      .searchDataFunction(newValue)
      .then((data) => {
        suggestions.value = data;
      })
      .finally(() => {
        isLoading.value = false;
      });
  }
});

const resetInput = () => {
  searchSuggestion.value = "";
  emit("update:selectedValue", undefined);
};
</script>

<template>
  <div data-testid="suggestions-input">
    <label class="fr-label" :for="inputId">{{ props.label }}</label>
    <DsfrInput :id="inputId" v-model="input" :label="props.label" :placeholder="props.placeholder" />

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
    <slot name="application-label">
      <DsfrTag
        v-if="searchSuggestion"
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
