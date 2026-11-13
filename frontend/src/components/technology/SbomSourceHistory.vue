<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import PaginationFooter from "@/components/PaginationFooter.vue";
import { sbomApi, sbomDate, sbomErrorMessage, type SbomSource, type SbomSourceImport } from "@/services/sbom";

const props = defineProps<{ applicationId: string; source: SbomSource; disabled: boolean }>();
const emit = defineEmits<{ inspect: [importId: string, event: Event] }>();
const entries = ref<SbomSourceImport[]>([]);
const total = ref(0);
const page = ref(0);
const pageSize = ref(20);
const loading = ref(false);
const error = ref("");
let sequence = 0;
let controller: AbortController | undefined;

function invalidate() {
  sequence++;
  controller?.abort();
}

watch(
  () => [props.applicationId, props.source.id, props.source.revision, props.source.importCount],
  () => {
    invalidate();
    page.value = 0;
    pageSize.value = 20;
    entries.value = props.source.imports.slice(0, 20);
    total.value = props.source.importCount ?? props.source.imports.length;
    loading.value = false;
    error.value = "";
  },
  { immediate: true, flush: "sync" },
);
onBeforeUnmount(invalidate);

async function loadPage(value: number) {
  invalidate();
  controller = new AbortController();
  const request = sequence;
  page.value = value;
  loading.value = true;
  error.value = "";
  entries.value = [];
  try {
    const result = await sbomApi.sourceImports(
      props.applicationId,
      props.source.id,
      { page: value, pageSize: pageSize.value },
      controller.signal,
    );
    if (request !== sequence) return;
    entries.value = result.results;
    total.value = result.total;
  } catch (cause) {
    if (request === sequence) error.value = sbomErrorMessage(cause);
  } finally {
    if (request === sequence) loading.value = false;
  }
}

async function resizePage(value: number) {
  pageSize.value = value;
  await loadPage(0);
}

function importStatus(value: string) {
  return value === "unchanged" ? "Vérification sans changement" : value === "committed" ? "Import confirmé" : "Analyse";
}
</script>

<template>
  <details data-testid="sbom-source-history">
    <summary>Historique de {{ source.name }} ({{ total }})</summary>
    <div v-if="error" class="fr-alert fr-alert--error" role="alert">
      <p>{{ error }}</p>
      <button type="button" class="fr-btn fr-btn--secondary" @click="loadPage(page)">Réessayer le chargement de l’historique</button>
    </div>
    <p v-if="loading" role="status">Chargement de l’historique…</p>
    <template v-else-if="!error">
      <p class="fr-sr-only" role="status" aria-live="polite">{{ entries.length }} imports affichés sur {{ total }}, page {{ page + 1 }}.</p>
      <ul>
        <li v-for="entry in entries" :key="entry.id" class="fr-mb-1w">
          {{ sbomDate(entry.createdAt) }} · {{ entry.format }} {{ entry.specVersion }} · {{ entry.componentCount }} composants ·
          {{ importStatus(entry.status) }}
          <button
            type="button"
            class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-ml-1w"
            :disabled="disabled"
            :aria-label="`Consulter l’import du ${sbomDate(entry.createdAt)} de ${source.name}`"
            @click="emit('inspect', entry.id, $event)"
          >
            Consulter
          </button>
        </li>
      </ul>
    </template>
    <PaginationFooter
      v-if="total > 20"
      :total-filtered="total"
      :page="page"
      :limit="pageSize"
      @update:page="loadPage"
      @update:limit="resizePage"
    />
  </details>
</template>
