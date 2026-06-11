<script setup lang="ts">
import { ref, watch, computed, nextTick } from "vue";
import { marked } from "marked";
import DOMPurify from "dompurify";

const props = defineProps<{ modelValue: string; disabled: boolean; ariaLabel?: string }>();
const emit = defineEmits<{ (e: "update:modelValue", value: string): void }>();

const localValue = ref(props.modelValue);
watch(
  () => props.modelValue,
  (val) => (localValue.value = val),
);

const currentTab = ref<"edit" | "preview">("edit");
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const emitChange = () => emit("update:modelValue", localValue.value);

function wrapSelection(before: string, after: string) {
  const textarea = textareaRef.value;
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = localValue.value.slice(start, end);
  const newText = before + selected + after;
  localValue.value = localValue.value.slice(0, start) + newText + localValue.value.slice(end);
  emitChange();
  nextTick(() => {
    textarea.setSelectionRange(start + before.length, end + before.length);
    textarea.focus();
  });
}

function insertAtStart(prefix: string) {
  const textarea = textareaRef.value;
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const lines = localValue.value.slice(start, end).split("\n");
  const newText = lines.map((line) => prefix + line).join("\n");
  localValue.value = localValue.value.slice(0, start) + newText + localValue.value.slice(end);
  emitChange();
  nextTick(() => {
    textarea.setSelectionRange(start, start + newText.length);
    textarea.focus();
  });
}

function insertAtCursor(text: string) {
  const textarea = textareaRef.value;
  if (!textarea) return;
  const start = textarea.selectionStart;
  localValue.value = localValue.value.slice(0, start) + text + localValue.value.slice(start);
  emitChange();
  nextTick(() => {
    textarea.setSelectionRange(start + text.length, start + text.length);
    textarea.focus();
  });
}

function insertLink() {
  wrapSelection("[texte du lien]", "(https://example.com)");
}

function insertTable() {
  const table = "\n| Colonne 1 | Colonne 2 |\n|-----------|-----------|\n| Valeur 1  | Valeur 2  |\n";
  insertAtCursor(table);
}

function handleKeydown(event: KeyboardEvent) {
  const textarea = textareaRef.value;
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  if (event.key === "Tab") {
    event.preventDefault();
    const lines = localValue.value.slice(start, end).split("\n");
    const isShift = event.shiftKey;
    const modifiedLines = lines.map((line) => {
      return isShift ? (line.startsWith("  ") ? line.slice(2) : line.replace(/^\t/, "")) : `  ${line}`;
    });
    const newText = modifiedLines.join("\n");
    localValue.value = localValue.value.slice(0, start) + newText + localValue.value.slice(end);
    emitChange();
    nextTick(() => {
      const offset = isShift ? -2 : 2;
      textarea.setSelectionRange(start + offset, end + offset);
    });
    return;
  }

  if (event.key === "Enter") {
    const before = localValue.value.slice(0, start);
    const lastLine = before.split("\n").at(-1) ?? "";

    if (/^(?:\s*[-*+]|\d+\.\s?)$/.test(lastLine)) {
      event.preventDefault();
      const indent = /^(\s*)/.exec(lastLine)?.[1] ?? "";
      insertAtCursor(`\n${indent}`);
      return;
    }

    const bulletMatch = /^(\s*)[-*+]\s/.exec(lastLine);
    if (bulletMatch) {
      event.preventDefault();
      const indent = bulletMatch[1] || "";
      insertAtCursor(`\n${indent}- `);
      return;
    }

    const numberMatch = /^(\s*)(\d+)\.\s/.exec(lastLine);
    if (numberMatch) {
      event.preventDefault();
      const indent = numberMatch[1] || "";
      const nextNumber = Number(numberMatch[2]) + 1;
      insertAtCursor(`\n${indent}${nextNumber}. `);
    }
  }
}

const tabs = [
  { title: "éditer", value: "edit", icon: "edit-line" },
  { title: "aperçu", value: "preview", icon: "eye-line" },
] as const;

const toolbarActions = [
  { title: "Gras", icon: "bold", handler: () => wrapSelection("**", "**") },
  { title: "Italique", icon: "italic", handler: () => wrapSelection("*", "*") },
  { title: "Titre H1", icon: "h-1", handler: () => insertAtStart("#") },
  { title: "Liste à puces", icon: "list-unordered", handler: () => insertAtStart("- ") },
  { title: "Liste numérotée", icon: "list-ordered", handler: () => insertAtStart("1. ") },
  { title: "Code", icon: "code-box-line", handler: () => wrapSelection("\n```\n", "\n```\n") },
  { title: "Citation", icon: "quote-line", handler: () => insertAtStart("> ") },
  { title: "Lien", icon: "link", handler: insertLink },
  { title: "Tableau", icon: "table-line", handler: insertTable },
];

const renderedHtml = computed(() => DOMPurify.sanitize(marked.parse(localValue.value, { async: false })));
</script>

<template>
  <div class="markdown-editor" data-testid="markdown-editor">
    <div class="editor-container">
      <div class="tab-column">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          :data-testid="`markdown-tab-${tab.value}`"
          :title="tab.title"
          type="button"
          class="icon-button"
          :class="{ active: currentTab === tab.value }"
          @click="currentTab = tab.value"
        >
          <i :class="`fr-icon-${tab.icon}`" aria-hidden="true" />
        </button>
      </div>

      <div class="main">
        <textarea
          v-if="currentTab === 'edit'"
          ref="textareaRef"
          v-model="localValue"
          class="editor fr-input"
          :disabled
          :aria-label="ariaLabel"
          rows="10"
          data-testid="markdown-textarea"
          @input="emitChange"
          @keydown="handleKeydown"
        />
        <div v-else v-use-mermaid class="preview" data-testid="markdown-preview" v-html="renderedHtml" />
      </div>

      <div class="toolbar">
        <button
          v-for="(action, index) in toolbarActions"
          :key="index"
          :data-testid="`markdown-toolbar-${index}`"
          type="button"
          class="icon-button"
          :title="action.title"
          @click="action.handler"
        >
          <i :class="`fr-icon-${action.icon}`" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.markdown-editor {
  display: flex;
  flex-direction: column;
}
.editor-container {
  display: flex;
  border: 1px solid #ccc;
  border-radius: 4px;
  min-height: 250px;
}
.tab-column {
  display: flex;
  flex-direction: column;
  border-right: 1px solid #ccc;
  padding: 0.5rem;
  gap: 0.5rem;
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.editor,
.preview {
  flex: 1;
  padding: 1rem;
  border: none;
  font-family: monospace;
  font-size: 0.95rem;
}

.toolbar {
  display: flex;
  flex-direction: column;
  border-left: 1px solid #ccc;
}

.icon-button {
  background: none;
  border: none;
  padding: 0.6rem;
  font-size: 1rem;
  cursor: pointer;
}

.icon-button:focus {
  outline: 2px solid #000;
  outline-offset: 2px;
}
.icon-button:hover {
  background: #f0f0f0;
}

.icon-button.active {
  background: #e3e6f3;
  color: #242424;
  box-shadow: inset 0 2px 6px #b1b7c2;
  border-radius: 8px;
  transform: translateY(2px) scale(0.97);
  transition:
    background 0.1s,
    box-shadow 0.1s,
    transform 0.1s;
}

.icon-button.active i {
  color: #242424;
}

.icon-button:active {
  background: #cfd6e6;
  transform: translateY(3px) scale(0.96);
}
</style>
