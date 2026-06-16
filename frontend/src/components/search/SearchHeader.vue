<script setup lang="ts">
import { ref, nextTick, computed } from "vue";
import { useRouter } from "vue-router";
import AccessibleAutocomplete from "../AccessibleAutocomplete.vue";
import { useApplicationSearch } from "@/composables/use-application-search";
import { useUserStore } from "@/stores/userStore";
import { Permission } from "@/client";
import { useDebounceFn, useMediaQuery } from "@vueuse/core";
import { getTimeQuadrant, type TimeQuadrant } from "@/utils/get-time-quadrant";

interface ApplicationOption {
  id: string | number;
  label: string;
  shortName?: string;
  organization?: string;
  timeQuadrant?: TimeQuadrant;
}

const router = useRouter();
const userStore = useUserStore();
const { searchApplications } = useApplicationSearch();
const searchRef = ref<{ clear?: () => void; focus?: () => void } | null>(null);
const isMobile = useMediaQuery("(max-width: 768px)");
const showInput = ref(!isMobile.value);
const suggestions = ref<ApplicationOption[]>([]);
const trimmedQuery = ref("");

const canSeeMDIT = computed(() => userStore.hasPermissions([Permission.MDIT_LIST]));

async function onLoupeClick() {
  showInput.value = true;
  await nextTick();
  searchRef.value?.focus?.();
}

function closeSearch() {
  showInput.value = false;
  searchRef.value?.clear?.();
}

async function fetchSuggestions(searchQuery: string): Promise<ApplicationOption[]> {
  trimmedQuery.value = searchQuery.trim();
  if (!trimmedQuery.value) return [];

  return new Promise((resolve) => {
    debouncedSearch(resolve);
  });
}

const debouncedSearch = useDebounceFn(async (resolve: (res: ApplicationOption[]) => void) => {
  const response = await searchApplications({ qPrefix: trimmedQuery.value, page: 0, pageSize: 8 }, false);

  suggestions.value = (response?.results ?? []).map((app): ApplicationOption => {
    const td = app.technicalDebtInfo;
    const timeQuadrant =
      canSeeMDIT.value && td?.technicalMaturity != null && td?.businessMaturity != null
        ? getTimeQuadrant(td.technicalMaturity, td.businessMaturity)
        : undefined;
    return { id: app.id, label: app.label, shortName: app.shortName ?? undefined, timeQuadrant };
  });

  resolve(suggestions.value);
}, 400);

function displayLabel(application: ApplicationOption | null) {
  return application ? (application.label ?? application.shortName ?? "") : "";
}

function onConfirm(selection: ApplicationOption | null) {
  if (!selection) return;
  if (selection.id != null) {
    const applicationId = selection.id;
    router.push({ name: "application", params: { id: applicationId } });
    searchRef.value?.clear?.();
    if (isMobile.value) closeSearch();
  }
}
</script>

<template>
  <div class="search-header">
    <label class="fr-sr-only" for="app-search">Recherche d’une application</label>

    <DsfrButton
      v-show="isMobile && !showInput"
      @click="onLoupeClick"
      tertiary
      class="loupe-button"
      aria-label="Ouvrir la recherche"
      data-testid="open-search-btn"
    >
      <v-icon name="ri-search-line" />
    </DsfrButton>

    <!-- Desktop : champ inline ; Mobile : overlay plein écran ouvert via la loupe. -->
    <div v-if="!isMobile || showInput" :class="['search-field', { 'mobile-search-overlay': isMobile && showInput }]">
      <div :class="{ 'overlay-header': isMobile && showInput }">
        <AccessibleAutocomplete
          ref="searchRef"
          id="app-search"
          title="Rechercher une application"
          list-label="Applications proposées"
          :search="fetchSuggestions"
          :display-label="displayLabel"
          :on-change="onConfirm"
          :display-no-result="true"
          placeholder="Rechercher une application…"
        >
          <template #suggestion="{ item }">
            <div class="suggestion">
              <strong>{{ item.label }}</strong>
              <template v-if="item.shortName || item.organization">
                <small v-if="item.shortName"> ({{ item.shortName }})</small>
                <em v-if="item.organization"> — {{ item.organization }}</em>
              </template>
              <span v-if="item.timeQuadrant" class="suggestion__time-badge">{{ item.timeQuadrant }}</span>
            </div>
          </template>
        </AccessibleAutocomplete>

        <DsfrButton
          v-if="isMobile && showInput"
          @click="closeSearch"
          tertiary
          class="close-overlay"
          aria-label="Fermer la recherche"
          data-testid="close-search-btn"
        >
          <v-icon name="ri-close-line" />
        </DsfrButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-header {
  position: relative;
  display: flex;
  justify-content: flex-end;
  margin: 1em;
  align-items: center;
}

/* Largeur du champ d'autocomplétion : assez large pour ne pas tronquer le
   placeholder, responsive, sans toucher au composant partagé AccessibleAutocomplete. */
.search-header :deep(.autocomplete) {
  width: clamp(20rem, 30vw, 28rem);
}

/* Dans l'overlay de recherche mobile, le champ occupe toute la largeur
   disponible (surcharge la largeur fixe desktop ci-dessus). */
.search-header .overlay-header {
  width: 100%;
  gap: 0.5rem;
}
.search-header .overlay-header :deep(.autocomplete) {
  flex: 1;
  width: auto;
}
.close-overlay {
  flex-shrink: 0;
}

.loupe-button {
  position: relative;
  margin-top: -18.99em;
  z-index: 999;
  margin-right: 1.2em;
}

.close-search {
  margin-left: 0.5rem;
}

.suggestion {
  display: flex;
  flex-direction: column;
  font-size: 0.95rem;
}

.suggestion small,
.suggestion em {
  color: #6b7280;
  font-size: 0.85rem;
}

.suggestion__time-badge {
  display: inline-block;
  margin-top: 0.25rem;
  font-size: 0.65rem;
  font-weight: bold;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: var(--blue-france-sun-113-625);
  color: white;
  align-self: flex-start;
}

@media (max-width: 768px) {
  .search-header {
    justify-content: flex-end;
  }
  .fr-input {
    width: 100%;
    max-width: 100%;
  }
}

.mobile-search-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: white;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  animation: fadeIn 0.2s ease;
}

.overlay-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.close-overlay {
  margin-left: 0.5rem;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
