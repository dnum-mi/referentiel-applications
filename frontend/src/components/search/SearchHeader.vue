<script setup lang="ts">
import { getCurrentInstance, ref } from "vue";
import { useRouter } from "vue-router";
import AccessibleAutocomplete from "../AccessibleAutocomplete.vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";

interface ApplicationOption {
  id: string | number
  label: string
  shortName?: string
  organization?: string
}

interface SearchResponse {
  results: ApplicationOption[]
  total?: number
}
const searchRef = ref<{ clear: () => void } | null>(null);
const instance = getCurrentInstance();
const router = useRouter();
let lastQuery = "";

const appStore = useApplicationSearchStore();
const { initialFilters } = appStore;

function escapeHtml(text: string = "") {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function trackSearch(query: string, origin: string, resultCount: number) {
  const matomo = (instance?.proxy as any)?.$matomo;
  if (!matomo) return;
  const encodedQuery = encodeURIComponent(query.trim());
  matomo.setCustomUrl(`/search?q=${encodedQuery}`);
  matomo.trackSiteSearch(query.trim(), "Applications", resultCount);
  matomo.trackPageView(`Recherche depuis ${origin} : ${query}`);
}

async function source(query: string, syncResults: (rows: ApplicationOption[]) => void) {
  try {
    const response = (await appStore.searchApplications(
      {
        ...initialFilters,
        search: query.trim() || undefined,
        page: 0,
        pageSize: 8,
      } as any,
      false,
    )) as Partial<SearchResponse> | undefined;

    const results = (response?.results ?? []) as ApplicationOption[];
    const totalCount = (response && (response.total ?? results.length)) || results.length;
    // Ignore stale responses if user kept typing
    if (query.trim() !== lastQuery.trim()) return;
    trackSearch(query, "header", totalCount);

    syncResults(results);
  } catch {
    if (query.trim() === lastQuery.trim()) {
      syncResults([]);
    }
  }
}

const templates = {
  inputValue: (application: ApplicationOption) => application?.label ?? application?.shortName ?? "",
  suggestion: (application: ApplicationOption) => {
    const label = escapeHtml(application?.label ?? "");
    const short = application?.shortName ? ` <small>(${escapeHtml(application.shortName)})</small>` : "";
    const org = application?.organization ? ` — <em>${escapeHtml(application.organization)}</em>` : "";
    return `${label}${short}${org}`;
  },
};

function onUpdateQuery(query: string) { lastQuery = query; }

function onConfirm(selection: { id?: string | number, label?: string } | string) {
  if (typeof selection !== "string" && selection?.id) {
    router.push({ name: "application", params: { id: selection.id } });
    searchRef.value?.clear();
  }
}
</script>

<template>
  <label class="fr-sr-only" for="app-search">
    Recherche d’une application avec autocomplétion
  </label>
  
  <AccessibleAutocomplete
    id="app-search"
    ref="searchRef"
    data-testid="search-header"
    :source="source"
    :templates="templates"
    name="app-search"
    display-menu="overlay"
    placeholder="Rechercher une application"
    :min-length="1"
    @confirm="onConfirm"
    @update:query="onUpdateQuery"
  />
</template>
