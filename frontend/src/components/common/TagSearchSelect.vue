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
  <fieldset class="tag-search-fieldset" v-bind="$attrs">
    <legend class="fr-label">Tags</legend>
    <ul class="fr-tags-group" data-testid="info-tags">
      <li v-for="(tag, index) in props.tags" :key="index" class="tag-item">
        <DsfrTag
          :label="tag"
          tag-name="button"
          class="fr-tag--dismiss"
          :aria-label="`Retirer le tag : ${tag}`"
          @click.stop.prevent="removeTag(index)"
        />
      </li>
    </ul>
    <label for="tag-search" class="fr-sr-only">Rechercher un tag à ajouter</label>
    <AccessibleAutocomplete
      id="tag-search"
      data-testid="search-tags"
      title="Rechercher un tag à ajouter"
      list-label="Tags proposés"
      :search="getTagsOptions"
      display-menu="overlay"
      placeholder="Rechercher un tag"
      :min-length="2"
      :on-change="addTag"
      :display-no-result="true"
      :display-label="(item) => item.name"
    />
  </fieldset>
</template>

<style scoped>
.tag-search-fieldset {
  border: none;
  margin: 0;
  padding: 0;
}
</style>
