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
const openBtnRef = ref<HTMLButtonElement | null>(null);
const closeBtnRef = ref<HTMLButtonElement | null>(null);
const panelRef = ref<HTMLDialogElement | HTMLDivElement | null>(null);
const isMobile = useMediaQuery("(max-width: 768px)");
const showInput = ref(!isMobile.value);

// Bascule desktop⇄mobile : ne pas laisser surgir l'overlay plein écran sur un
// simple redimensionnement (il ne doit s'ouvrir que sur action explicite).
watch(isMobile, (mobile) => {
  if (panelRef.value instanceof HTMLDialogElement && panelRef.value.open) panelRef.value.close();
  showInput.value = !mobile;
});

async function onLoupeClick() {
  showInput.value = true;
  await nextTick();
  if (panelRef.value instanceof HTMLDialogElement) panelRef.value.showModal();
  searchRef.value?.focus?.();
}

async function focusSearch() {
  if (isMobile.value && !showInput.value) await onLoupeClick();
  else searchRef.value?.focus?.();
}

function restoreLoupeFocus() {
  nextTick(() => openBtnRef.value?.focus());
}

function closeSearch() {
  if (panelRef.value instanceof HTMLDialogElement && panelRef.value.open) panelRef.value.close();
  searchRef.value?.clear?.();
  showInput.value = false;
  restoreLoupeFocus();
}

function onDialogKeydown(event: KeyboardEvent) {
  if (!isMobile.value) return;
  // L'autocomplete intercepte déjà Échap lorsque ses suggestions sont ouvertes.
  // Le second Échap ferme le dialogue, sans atteindre le gestionnaire du menu DSFR.
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    closeSearch();
    return;
  }
  if (event.key !== "Tab") return;
  const input = document.getElementById("app-search");
  const closeButton = closeBtnRef.value;
  if (!input || !closeButton) return;
  if (event.shiftKey && document.activeElement === input) {
    event.preventDefault();
    closeButton.focus();
  } else if (!event.shiftKey && document.activeElement === closeButton) {
    event.preventDefault();
    input.focus();
  }
}

async function fetchSuggestions(searchQuery: string): Promise<ApplicationOption[]> {
  const trimmed = searchQuery.trim();
  if (!trimmed) return [];

  // La recherche du bandeau est indépendante des filtres de la page.
  // L'autocomplete distingue une erreur d'une réponse sans résultat.
  const response = await searchApplications({ qPrefix: trimmed, page: 0, pageSize: 8, sortBy: "relevance" }, false, false);
  if (!response) throw new Error("La recherche est momentanément indisponible.");
  return response.results.map((app): ApplicationOption => ({ id: app.id, label: app.label, shortName: app.shortName ?? undefined }));
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
</script>

<template>
  <div id="app-search-shortcut" class="search-header" tabindex="-1" @focus="focusSearch">
    <button
      v-show="isMobile && !showInput"
      ref="openBtnRef"
      @click="onLoupeClick"
      type="button"
      class="fr-btn fr-btn--tertiary loupe-button"
      aria-label="Ouvrir la recherche"
      data-testid="open-search-btn"
    >
      <span class="fr-icon-search-line" aria-hidden="true" />
      <span>Ouvrir la recherche</span>
    </button>

    <!-- Desktop : champ inline ; Mobile : overlay plein écran (boîte de dialogue) ouvert via la loupe. -->
    <component
      :is="isMobile ? 'dialog' : 'div'"
      v-if="!isMobile || showInput"
      ref="panelRef"
      :class="['search-field', { 'mobile-search-overlay': isMobile && showInput }]"
      :aria-label="isMobile && showInput ? 'Recherche d’une application' : undefined"
      @cancel.prevent="closeSearch"
      @keydown="onDialogKeydown"
    >
      <div :class="{ 'overlay-header': isMobile && showInput }">
        <label class="fr-sr-only" for="app-search">Recherche d’une application</label>
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
              <small v-if="item.shortName"> ({{ item.shortName }})</small>
            </div>
          </template>
        </AccessibleAutocomplete>

        <button
          v-if="isMobile && showInput"
          ref="closeBtnRef"
          @click="closeSearch"
          type="button"
          class="fr-btn fr-btn--tertiary close-overlay"
          aria-label="Fermer la recherche"
          data-testid="close-search-btn"
        >
          <span class="fr-icon-close-line" aria-hidden="true" />
        </button>
      </div>
    </component>
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
  max-width: 100%;
  min-width: 0;
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
  gap: 0.5rem;
  max-width: 100%;
}

.suggestion {
  display: flex;
  flex-direction: column;
  font-size: 0.95rem;
}

.suggestion small {
  color: var(--text-mention-grey);
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
  max-width: 100%;
  max-height: 100%;
  margin: 0;
  border: 0;
  box-sizing: border-box;
  background: var(--background-default-grey);
  color: var(--text-default-grey);
  display: flex;
  flex-direction: column;
  padding: 1rem;
  animation: fadeIn 0.2s ease;
}

.mobile-search-overlay:not([open]) {
  display: none;
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
