<script setup lang="ts">
import { isApiSuccess } from "@/api/api-result";
import type { TagDto } from "@/client";
import api from "@/api";
import { nextTick, ref, useId } from "vue";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    tags?: string[];
    tooltipContent?: string;
  }>(),
  {
    tags: () => [],
    tooltipContent: undefined,
  },
);

const emit = defineEmits<{
  "update:tags": [value: string[]];
}>();
const fieldset = ref<HTMLFieldSetElement>();
const tooltipId = `tag-search-${useId()}-tooltip`;

async function getTagsOptions(query: string) {
  const response = await api.tagsControllerFindAll({
    query: {
      name: query.trim(),
      page: 0,
      pageSize: 10,
    },
  });

  if (!isApiSuccess(response) || !response.data) {
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

async function removeTag(index: number) {
  const previousFocus = document.activeElement;
  const restoreFocus = previousFocus instanceof HTMLElement && !!fieldset.value?.contains(previousFocus);
  emit(
    "update:tags",
    props.tags.filter((_, i) => i !== index),
  );
  await nextTick();
  if (!restoreFocus || (document.activeElement !== previousFocus && document.activeElement !== document.body)) return;
  const remaining = fieldset.value?.querySelectorAll<HTMLButtonElement>(".fr-tags-group button");
  const target = remaining?.[Math.min(index, remaining.length - 1)] ?? fieldset.value?.querySelector<HTMLInputElement>('[role="combobox"]');
  target?.focus();
}
</script>
<template>
  <div class="tag-search-group">
    <fieldset ref="fieldset" class="tag-search-fieldset" :aria-describedby="tooltipContent ? tooltipId : undefined" v-bind="$attrs">
      <legend class="fr-label tag-search-legend">Tags</legend>
      <DsfrTooltip
        v-if="tooltipContent"
        class="tag-search-help"
        :id="tooltipId"
        aria-label="Afficher l’aide sur le filtre Tags"
        :content="tooltipContent"
      />
      <ul class="fr-tags-group" data-testid="info-tags">
        <li v-for="(tag, index) in props.tags" :key="tag" class="tag-item">
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
        :description-id="tooltipContent ? tooltipId : undefined"
        :on-change="addTag"
        :display-no-result="true"
        :display-label="(item) => item.name"
      />
    </fieldset>
  </div>
</template>

<style scoped>
.tag-search-group {
  position: relative;
}

.tag-search-fieldset {
  position: static;
  border: none;
  margin: 0;
  padding: 0;
}

.tag-search-legend {
  padding-inline-end: 2rem;
}
.tag-search-fieldset :deep(.tag-search-help) {
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
}
</style>
