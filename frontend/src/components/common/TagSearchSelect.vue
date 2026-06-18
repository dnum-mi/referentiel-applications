<script setup lang="ts">
import type { TagDto } from "@/client";
import api from "@/api";

defineOptions({ inheritAttrs: false });

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

async function getTagsOptions(query: string) {
  const response = await api.tagsControllerFindAll({
    query: {
      name: query.trim(),
      page: 0,
      pageSize: 10,
    },
  });

  if (!response.response.ok || !response.data) {
    throw new Error("Failed to fetch tags");
  }

  const data = response.data;
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
  <ul class="fr-tags-group" v-bind="$attrs" data-testid="info-tags">
    <li v-for="(tag, index) in props.tags" :key="index" class="tag-item">
      <DsfrTag
        :label="tag"
        tag-name="button"
        class="fr-tag--dismiss"
        :title="`Supprimer le tag : ${tag}`"
        @click.stop.prevent="removeTag(index)"
      />
    </li>
  </ul>
  <label for="tag-search" class="fr-label">Tags</label>
  <AccessibleAutocomplete
    id="tag-search"
    data-testid="search-tags"
    title="Tags"
    list-label="Tags proposés"
    :search="getTagsOptions"
    display-menu="overlay"
    placeholder="Rechercher un tag"
    :min-length="2"
    :onChange="addTag"
    :displayNoResult="true"
    :displayLabel="(item) => item.name"
  />
</template>
