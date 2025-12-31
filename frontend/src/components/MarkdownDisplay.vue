<script setup lang="ts">
import { computed } from "vue";
import { marked } from "marked";
import DOMPurify from "dompurify";

const props = defineProps<{
  content: string | null | undefined;
}>();

const renderedHtml = computed(() => {
  const dirty = marked.parse(props.content || "");
  return DOMPurify.sanitize(dirty);
});
</script>

<template>
  <div class="markdown-preview" data-testid="markdown-display" v-html="renderedHtml" />
</template>

<style scoped>
.markdown-preview {
  font-family: system-ui, sans-serif;
  line-height: 1.5;
  word-break: break-word;
}

.markdown-preview h1,
.markdown-preview h2,
.markdown-preview h3,
.markdown-preview h4 {
  margin-top: 1rem;
  font-weight: 600;
}

.markdown-preview ul,
.markdown-preview ol {
  margin-left: 1.5rem;
  margin-bottom: 1rem;
}

.markdown-preview pre {
  background: #f4f4f4;
  padding: 0.75rem;
  overflow-x: auto;
  border-radius: 4px;
}

.markdown-preview code {
  background: #f1f1f1;
  padding: 0.2rem 0.4rem;
  font-size: 0.875em;
  border-radius: 3px;
}

.markdown-preview table {
  border-collapse: collapse;
  width: 100%;
  margin: 1rem 0;
}

.markdown-preview th,
.markdown-preview td {
  border: 1px solid #ccc;
  padding: 0.5rem;
  text-align: left;
}
</style>
