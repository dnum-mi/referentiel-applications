<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { DEFAULT_FILTERS, useApplicationSearch, type Filters } from "@/composables/use-application-search";
import { useSavedFilterStore } from "@/stores/savedFilterStore";
import { useSubmissionFocus } from "@/composables/use-submission-focus";

const { filters, setFilter } = useApplicationSearch();
const savedFilterStore = useSavedFilterStore();

const showSaveModal = ref(false);
const filterName = ref("");
const saveError = ref("");
const panel = ref<HTMLElement | null>(null);
const pendingDeleteIds = ref(new Set<string>());
const isSavingFilter = ref(false);
useSubmissionFocus(isSavingFilter);
const showRenameModal = ref(false);
const renameId = ref<string | null>(null);
const renameName = ref("");
const renameError = ref("");
const isRenamingFilter = ref(false);
const renameOrigin = ref<HTMLElement | null>(null);
let renameSession = 0;
useSubmissionFocus(isRenamingFilter);

function openRenameModal(id: string, event: Event) {
  const saved = savedFilterStore.savedFilters.find((filter) => filter.id === id);
  if (!saved) return;
  renameSession++;
  renameId.value = id;
  renameName.value = saved.name;
  renameError.value = "";
  renameOrigin.value = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  showRenameModal.value = true;
}

function closeRenameModal() {
  const session = ++renameSession;
  const origin = renameOrigin.value;
  showRenameModal.value = false;
  isRenamingFilter.value = false;
  renameError.value = "";
  // Le bouton reste dans la liste et garde le même id après renommage.
  nextTick(() => {
    if (session === renameSession && origin?.isConnected) origin.focus();
  });
}

async function confirmRename() {
  const id = renameId.value;
  const name = renameName.value.trim();
  if (!id || !name || name.length > 100 || isRenamingFilter.value) return;
  const session = renameSession;
  isRenamingFilter.value = true;
  renameError.value = "";
  try {
    await savedFilterStore.renameFilter(id, name);
    if (session === renameSession) closeRenameModal();
  } catch (error) {
    if (session === renameSession) {
      renameError.value = `${error instanceof Error ? error.message : "Erreur lors du renommage du filtre."} Votre saisie est conservée.`;
    }
  } finally {
    if (session === renameSession) isRenamingFilter.value = false;
  }
}

function openSaveModal() {
  filterName.value = "";
  saveError.value = "";
  showSaveModal.value = true;
}

function closeSaveModal() {
  showSaveModal.value = false;
  saveError.value = "";
}

async function confirmSave(event: Event) {
  const name = filterName.value.trim();
  if (!name || isSavingFilter.value) return;
  const existing = savedFilterStore.savedFilters.find((saved) => saved.name === name);
  if (existing && !globalThis.confirm(`Remplacer le filtre sauvegardé « ${name} » par les filtres actuels ?`)) {
    if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus();
    return;
  }

  isSavingFilter.value = true;
  saveError.value = "";
  try {
    const saved = await savedFilterStore.saveFilter(name, filters.value);
    if (saved) {
      closeSaveModal();
    } else {
      saveError.value = "Erreur lors de la sauvegarde du filtre. Votre saisie est conservée.";
    }
  } finally {
    isSavingFilter.value = false;
  }
}

// #2386 : un filtre sauvegardé ne contient QUE les clés renseignées (les valeurs par défaut
// `undefined` disparaissent du JSON). `setFilter` fait un merge : appliquer directement
// `saved.filters` laisserait les clés absentes (texte, millésime, compliance…) à leur valeur
// courante. On réinitialise donc d'abord à `DEFAULT_FILTERS` pour obtenir un vrai remplacement.
// `structuredClone` évite de partager les tableaux par défaut (tag, currentStatus__in…).
function applyFilter(id: string) {
  const saved = savedFilterStore.savedFilters.find((f) => f.id === id);
  if (!saved) return;
  setFilter({ ...structuredClone(DEFAULT_FILTERS), ...(saved.filters as Filters), page: 0 });
}

async function removeFilter(id: string, event: Event) {
  event.stopPropagation();
  if (pendingDeleteIds.value.has(id)) return;
  const index = savedFilterStore.savedFilters.findIndex((filter) => filter.id === id);
  const saved = savedFilterStore.savedFilters[index];
  if (!saved) return;
  const trigger = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  if (!globalThis.confirm(`Supprimer définitivement le filtre sauvegardé « ${saved.name} » ?`)) {
    trigger?.focus();
    return;
  }

  pendingDeleteIds.value.add(id);
  try {
    await savedFilterStore.deleteFilter(id);
  } finally {
    pendingDeleteIds.value.delete(id);
    await nextTick();
    if (document.activeElement === document.body || document.activeElement === trigger) {
      if (trigger?.isConnected) {
        trigger.focus();
      } else {
        const remainingButtons = Array.from(panel.value?.querySelectorAll<HTMLElement>(".saved-filter-delete") ?? []);
        (
          remainingButtons[index] ??
          remainingButtons.at(-1) ??
          panel.value?.querySelector<HTMLElement>('[data-testid="save-filter-button"]')
        )?.focus();
      }
    }
  }
}

onMounted(() => {
  savedFilterStore.fetchSavedFilters();
});
</script>

<template>
  <div ref="panel" class="saved-filters" data-testid="saved-filters">
    <DsfrButton
      tertiary
      size="small"
      icon="ri-bookmark-line"
      label="Sauvegarder les filtres actuels"
      class="save-filter-button"
      data-testid="save-filter-button"
      @click="openSaveModal"
    />

    <p v-if="savedFilterStore.savedFilters.length === 0" class="saved-filters-empty fr-text--sm">Aucun filtre sauvegardé pour le moment.</p>

    <ul v-else class="saved-filters-list" data-testid="saved-filters-list">
      <li v-for="saved in savedFilterStore.savedFilters" :key="saved.id" class="saved-filter-item">
        <button type="button" class="saved-filter-name" :data-testid="`saved-filter-apply-${saved.id}`" @click="applyFilter(saved.id)">
          {{ saved.name }}
        </button>
        <button
          type="button"
          class="saved-filter-rename"
          :data-testid="`saved-filter-rename-${saved.id}`"
          :aria-label="`Renommer le filtre ${saved.name}`"
          @click="openRenameModal(saved.id, $event)"
        >
          <VIcon name="ri-edit-line" />
        </button>
        <button
          type="button"
          class="saved-filter-delete"
          :data-testid="`saved-filter-delete-${saved.id}`"
          :aria-label="`Supprimer le filtre ${saved.name}`"
          :aria-disabled="pendingDeleteIds.has(saved.id) ? true : undefined"
          @click="removeFilter(saved.id, $event)"
        >
          <VIcon name="ri-delete-bin-line" />
        </button>
      </li>
    </ul>

    <!-- Téléportée hors de `.sidebar` : cet ancêtre pose `position: relative` + `z-index: 5`,
    ce qui crée un contexte d'empilement local. Une modale rendue en place y resterait
    piégée et passerait sous le header DSFR (z-index 750) malgré son propre z-index. -->
    <Teleport to="body">
      <DsfrModal
        :opened="showRenameModal"
        title="Renommer le filtre personnel"
        size="sm"
        data-testid="rename-filter-modal"
        @close="closeRenameModal"
      >
        <div role="alert" aria-live="assertive" aria-atomic="true">
          <p v-if="renameError" class="fr-error-text" data-testid="rename-filter-error">{{ renameError }}</p>
        </div>
        <DsfrInputGroup
          v-model="renameName"
          label="Nouveau nom du filtre"
          label-visible
          required
          :maxlength="100"
          hint="Seul le nom change. Les critères enregistrés et la recherche en cours sont conservés."
          data-testid="rename-filter-name-input"
          @keyup.enter="confirmRename"
        />
        <template #footer>
          <DsfrButtonGroup :inline-layout-when="true" :reverse="true">
            <li><DsfrButton label="Annuler" secondary @click="closeRenameModal" /></li>
            <li>
              <DsfrButton
                label="Renommer"
                :disabled="!renameName.trim() || renameName.trim().length > 100 || isRenamingFilter"
                data-testid="confirm-rename-filter-button"
                @click="confirmRename"
              />
            </li>
          </DsfrButtonGroup>
        </template>
      </DsfrModal>
      <DsfrModal
        :opened="showSaveModal"
        title="Sauvegarder les filtres actuels"
        size="sm"
        data-testid="save-filter-modal"
        @close="closeSaveModal"
      >
        <div role="alert" aria-live="assertive" aria-atomic="true">
          <p v-if="saveError" class="fr-error-text" data-testid="save-filter-error">{{ saveError }}</p>
        </div>
        <DsfrInputGroup
          v-model.trim="filterName"
          label="Nom du filtre"
          label-visible
          required
          hint="Un filtre existant portant ce nom sera remplacé."
          data-testid="save-filter-name-input"
          @keyup.enter="confirmSave"
        />
        <template #footer>
          <DsfrButtonGroup :inline-layout-when="true" :reverse="true">
            <li><DsfrButton label="Annuler" secondary @click="closeSaveModal" /></li>
            <li>
              <DsfrButton
                label="Sauvegarder"
                :disabled="!filterName.trim() || isSavingFilter"
                data-testid="confirm-save-filter-button"
                @click="confirmSave"
              />
            </li>
          </DsfrButtonGroup>
        </template>
      </DsfrModal>
    </Teleport>
  </div>
</template>

<style scoped>
.save-filter-button {
  width: 100%;
  justify-content: center;
}

.saved-filters-empty {
  color: var(--text-mention-grey);
  margin: 0.5rem 0 0;
}

.saved-filters-list {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.saved-filter-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem;
}

.saved-filter-name {
  flex: 1;
  text-align: left;
  background: none;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.saved-filter-name:hover {
  background-color: var(--background-contrast-grey);
}

.saved-filter-delete,
.saved-filter-rename {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-mention-grey);
  padding: 0.25rem;
}

.saved-filter-delete:hover {
  color: var(--text-default-error);
}
</style>
