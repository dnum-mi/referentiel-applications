<script setup lang="ts">
import type { TagDto } from "@/client";
import api from "@/api";

const props = withDefaults(
  defineProps<{
    tags?: string[];
  }>(),
  {
    tags: () => [],
  },
);

const emit = defineEmits<{
  "update:tags": [value: string[]];
}>();

interface TagsPaginatedResponse {
  results: TagDto[];
  total: number;
}

async function getTagsOptions(query: string) {
  const response = await api.tagsControllerFindAll({
    query: {
      name: query.trim(),
      page: 0,
      pageSize: 10,
    },
  });

  if (!response.response.ok) {
    throw new Error("Failed to fetch tags");
  }

  const data = response.data as TagsPaginatedResponse;
  return data.results;
}

function addTag(selection: TagDto) {
  if (!props.tags.includes(selection.name)) {
    emit("update:tags", [...props.tags, selection.name]);
  }
}

function removeTag(index: number) {
  emit(
    "update:tags",
    props.tags.filter((_, i) => i !== index),
  );
}
</script>
<template>
  <ul class="fr-tags-group" data-testid="info-tags">
    <li v-for="(tag, index) in props.tags" :key="index" class="tag-item">
      <DsfrTag :label="tag" selectable @click.stop.prevent="removeTag(index)" class="fr-tag--dismiss" />
    </li>
  </ul>
  <AccessibleAutocomplete
    id="tag-search"
    data-testid="search-tags"
    :search="getTagsOptions"
    display-menu="overlay"
    placeholder="Rechercher un tag"
    :min-length="2"
    :onChange="addTag"
    :displayNoResult="true"
    :isSearch="true"
    :displayLabel="(item) => item.name"
  />
</template>
