<script setup lang="ts">
import { onMounted, ref } from "vue";
import { DEFAULT_FILTERS, useApplicationSearch, type Filters } from "@/composables/use-application-search";
import { useSavedFilterStore } from "@/stores/savedFilterStore";

const { filters, setFilter } = useApplicationSearch();
const savedFilterStore = useSavedFilterStore();

const showSaveModal = ref(false);
const filterName = ref("");

function openSaveModal() {
  filterName.value = "";
  showSaveModal.value = true;
}

function closeSaveModal() {
  showSaveModal.value = false;
}

async function confirmSave() {
  const name = filterName.value.trim();
  if (!name) return;
  const saved = await savedFilterStore.saveFilter(name, filters.value);
  if (saved) {
    closeSaveModal();
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

function removeFilter(id: string, event: Event) {
  event.stopPropagation();
  savedFilterStore.deleteFilter(id);
}

onMounted(() => {
  savedFilterStore.fetchSavedFilters();
});
</script>

<template>
  <div class="saved-filters" data-testid="saved-filters">
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
          class="saved-filter-delete"
          :data-testid="`saved-filter-delete-${saved.id}`"
          :aria-label="`Supprimer le filtre ${saved.name}`"
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
        :opened="showSaveModal"
        title="Sauvegarder les filtres actuels"
        size="sm"
        data-testid="save-filter-modal"
        @close="closeSaveModal"
      >
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
            <DsfrButton label="Annuler" secondary @click="closeSaveModal" />
            <DsfrButton label="Sauvegarder" :disabled="!filterName.trim()" data-testid="confirm-save-filter-button" @click="confirmSave" />
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

.saved-filter-delete {
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
