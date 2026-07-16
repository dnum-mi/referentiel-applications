<script setup lang="ts">
import { ref, nextTick, watch } from "vue";
import { useRouter } from "vue-router";
import AccessibleAutocomplete from "../AccessibleAutocomplete.vue";
import { useApplicationSearch } from "@/composables/use-application-search";
import { useMediaQuery } from "@vueuse/core";

interface ApplicationOption {
  id: string | number;
  label: string;
  shortName?: string;
}

const router = useRouter();
const { searchApplications } = useApplicationSearch();
const searchRef = ref<{ clear?: () => void; focus?: () => void } | null>(null);
const openBtnRef = ref<{ $el?: HTMLElement } | null>(null);
const closeBtnRef = ref<{ $el?: HTMLElement } | null>(null);
const isMobile = useMediaQuery("(max-width: 768px)");
const showInput = ref(!isMobile.value);

// Bascule desktop⇄mobile : ne pas laisser surgir l'overlay plein écran sur un
// simple redimensionnement (il ne doit s'ouvrir que sur action explicite).
watch(isMobile, (mobile) => {
  showInput.value = !mobile;
});

async function onLoupeClick() {
  showInput.value = true;
  await nextTick();
  searchRef.value?.focus?.();
}

function restoreLoupeFocus() {
  nextTick(() => openBtnRef.value?.$el?.querySelector("button")?.focus());
}

function closeSearch() {
  showInput.value = false;
  searchRef.value?.clear?.();
  restoreLoupeFocus();
}

// Piège de focus de la boîte de dialogue mobile : le Tab boucle entre le champ
// de recherche et le bouton « Fermer », sans jamais sortir de l'overlay.
function onOverlayKeydown(e: KeyboardEvent) {
  if (e.key !== "Tab") return;
  const input = document.getElementById("app-search");
  const closeBtn = closeBtnRef.value?.$el?.querySelector("button");
  if (!input || !closeBtn) return;
  const active = document.activeElement;
  if (!e.shiftKey && active === closeBtn) {
    e.preventDefault();
    input.focus();
  } else if (e.shiftKey && active === input) {
    e.preventDefault();
    closeBtn.focus();
  }
}

async function fetchSuggestions(searchQuery: string): Promise<ApplicationOption[]> {
  const trimmed = searchQuery.trim();
  if (!trimmed) return [];

  try {
    // Recherche INDÉPENDANTE des filtres de la page (mergeCurrentFilters = false)
    // et triée par PERTINENCE (ts_rank), pas par le tri de la page de recherche.
    const response = await searchApplications({ qPrefix: trimmed, page: 0, pageSize: 8, sortBy: "relevance" }, false, false);

    return (response?.results ?? []).map(
      (app): ApplicationOption => ({ id: app.id, label: app.label, shortName: app.shortName ?? undefined }),
    );
  } catch {
    // L'autocomplete gère l'affichage ; on renvoie une liste vide en cas d'échec.
    return [];
  }
}

function displayLabel(application: ApplicationOption | null) {
  return application ? (application.label ?? application.shortName ?? "") : "";
}

function onConfirm(selection: ApplicationOption | null) {
  if (!selection || selection.id == null) return;
  router.push({ name: "application", params: { id: selection.id } });
  searchRef.value?.clear?.();
  if (isMobile.value) closeSearch();
}

// Échap depuis l'autocomplete (liste déjà fermée) → ferme l'overlay mobile.
function onClose() {
  if (isMobile.value && showInput.value) closeSearch();
}
</script>

<template>
  <div class="search-header">
    <label class="fr-sr-only" for="app-search">Recherche d’une application</label>

    <DsfrButton
      v-show="isMobile && !showInput"
      ref="openBtnRef"
      @click="onLoupeClick"
      tertiary
      class="loupe-button"
      aria-label="Ouvrir la recherche"
      data-testid="open-search-btn"
    >
      <v-icon name="ri-search-line" />
    </DsfrButton>

    <!-- Desktop : champ inline ; Mobile : overlay plein écran (boîte de dialogue) ouvert via la loupe. -->
    <div
      v-if="!isMobile || showInput"
      :class="['search-field', { 'mobile-search-overlay': isMobile && showInput }]"
      :role="isMobile && showInput ? 'dialog' : undefined"
      :aria-modal="isMobile && showInput ? 'true' : undefined"
      :aria-label="isMobile && showInput ? 'Recherche d’une application' : undefined"
      @keydown="isMobile && showInput ? onOverlayKeydown($event) : undefined"
    >
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
          @close="onClose"
        >
          <template #suggestion="{ item }">
            <div class="suggestion">
              <strong>{{ item.label }}</strong>
              <small v-if="item.shortName"> ({{ item.shortName }})</small>
            </div>
          </template>
        </AccessibleAutocomplete>

        <DsfrButton
          v-if="isMobile && showInput"
          ref="closeBtnRef"
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

/* FIXME : `-18.99em` est un nombre magique fragile qui remonte la loupe dans le
   bandeau. Il dépend de la hauteur du header et casserait à la moindre évolution
   de mise en page. À remplacer par un positionnement robuste (le header devrait
   piloter l'alignement, p. ex. flex/grid) — à faire avec une vérification
   visuelle mobile, non modifié ici pour ne pas régresser à l'aveugle. */
.loupe-button {
  position: relative;
  margin-top: -18.99em;
  z-index: 999;
  margin-right: 1.2em;
}

.suggestion {
  display: flex;
  flex-direction: column;
  font-size: 0.95rem;
}

.suggestion small {
  color: #6b7280;
  font-size: 0.85rem;
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
