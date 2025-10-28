<script setup lang="ts">
import type { TagDto } from '@/client';
import { useTagStore } from '@/stores/tagStore';

const props = defineProps<{
  tags?: string[]
}>();

const emit = defineEmits<{
  (e: 'update:tags', value: string[]): void;
}>();

const tagStore = useTagStore();
const searchRef = ref<{ clear: () => void } | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

async function getTagsOptions(query: string): Promise<TagDto[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];
  try {
    const response = await tagStore.find(query.trim());

    return response;
  } catch {
    return [];
  }
}

function addTag(selection: TagDto | string) {
  const name =
    typeof selection === "string"
      ? selection
      : selection?.name;

  if (!name) return;

  const newTags = props.tags ? [...props.tags] : [];

  if (!newTags.includes(name)) {
    newTags.push(name);
    emit("update:tags", newTags);
  }

  searchRef.value?.clear();
}

function removeTag(index: number) {
  const newTags = [...props.tags];
  newTags.splice(index, 1);
  emit("update:tags", newTags);
}

function displayLabel(tag: TagDto | null) {
  return tag ? tag.name : "";
}
</script>
<template>
  <ul class="fr-tags-group" data-testid="info-tags">
    <li v-for="(tag, index) in props.tags" :key="index" class="tag-item" >
      <DsfrTag
        :label="tag"
        selectable
        @click.stop.prevent="removeTag(index)"
        class="fr-tag--dismiss"
      />
    </li>
  </ul>
  <AccessibleAutocomplete
    id="tag-search"
    ref="searchRef"
    data-testid="search-tags"
    :search="getTagsOptions"
    display-menu="overlay"
    placeholder="Rechercher un tag"
    :min-length="2"
    :onChange="addTag"
    :displayNoResult="true"
    :isSearch="true"
    :displayLabel="displayLabel"
    :inputRef="inputRef"
  >
    <template #suggestion="{ item }">
      <div class="suggestion">
        <strong>{{ item.name }}</strong>
      </div>
    </template>
  </AccessibleAutocomplete>
</template>
<style>
.autocomplete-tags {
  width: 100%;
  display: block;
}

.autocomplete-tags .autocomplete , .autocomplete-tags .autocomplete__input,
.autocomplete-tags .accessible-autocomplete__input {
  width: 100% !important;
  max-width: 100%;
  box-sizing: border-box;
}
</style>