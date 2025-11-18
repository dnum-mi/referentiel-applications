<script setup lang="ts">
import type { TagDto } from '@/client';
import { useTagStore } from '@/stores/tagStore';

const props = defineProps<{
  tags: string[]
}>();

const emit = defineEmits<{
  'update:tags': [value: string[]]
}>();

const tagStore = useTagStore();

async function getTagsOptions(query: string){
  return await tagStore.find(query.trim());
}

function addTag(selection: TagDto) {
  if (!props.tags.includes(selection.name)) {
    emit("update:tags", [...props.tags, selection.name]);
  }
}

function removeTag(index: number) {
  emit("update:tags", props.tags.filter((_, i) => i !== index));
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