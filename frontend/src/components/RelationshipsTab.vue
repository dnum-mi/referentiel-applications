<script setup lang="ts">
import { watchEffect } from "vue";
import { useRelationStore } from "@/stores/relationStore";
import { useRelationManager } from "@/composables/use-relation-manager";
import type { Application } from "@/models/Application";

const props = defineProps<{ application: Application }>();
const emit = defineEmits<{ (e: "update:application", app: Application): void }>();

const store = useRelationStore();

watchEffect(() => {
  if (props.application) {
    store.setApplication(props.application);
  }
});

const {
  headers,
  rows,
  selectedRelationIds,
  currentPage,
  showDeleteConfirmation,
  isAddRelationModalOpen,
  isEditRelationModalOpen,
  relationToEdit,
  editRelation,
  removeSelectedRelations,
  confirmDelete,
  cancelDelete,
  openAddRelationModal,
  closeAddRelationModal,
  handleAddRelation,
  closeEditRelationModal,
  handleUpdateRelation,
} = useRelationManager(props.application, emit);
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
    <div class="fr-col">
      <h3 class="fr-mb-0">Gestion des relations de {{ store.currentApplication.label }}</h3>
    </div>
    <div class="fr-col-auto">
      <DsfrButton type="button" class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-add-line" @click="openAddRelationModal">
        Ajouter une relation
      </DsfrButton>
    </div>
  </div>

  <div class="global-delete">
    <DsfrButton
      type="button"
      tertiary
      @click="removeSelectedRelations"
      icon="fr-icon-delete-line"
      :disabled="selectedRelationIds.length === 0"
    >
      Supprimer la sélection
    </DsfrButton>
  </div>

  <div v-if="rows.length === 0" class="text-center">
    <p>Aucune relation définie.</p>
  </div>

  <DsfrDataTable
    v-else
    v-model:selection="selectedRelationIds"
    v-model:current-page="currentPage"
    :headers-row="headers"
    :rows="rows"
    row-key="Sélection"
    title="Liste des relations associées"
    pagination
    :rows-per-page="5"
    :pagination-options="[5, 10, 20, 30]"
    sorted="Sélection"
    :sortable-rows="['Sélection']"
  >
    <template #cell="{ colKey, cell }">
      <template v-if="colKey === 'Sélection'">
        <input type="checkbox" :value="cell" v-model="selectedRelationIds" />
      </template>
      <template v-else-if="colKey === 'Actions'">
        <DsfrButton tertiary size="sm" icon="fr-icon-edit-line" @click="cell.edit()">Modifier</DsfrButton>
      </template>
      <template v-else>
        {{ cell }}
      </template>
    </template>
  </DsfrDataTable>

  <AddRelationModal
    :opened="isAddRelationModalOpen"
    title="Ajouter une relation"
    :applicationId="store.currentApplication.id"
    @close="closeAddRelationModal"
    @update:application="handleAddRelation"
    @add-relation="handleAddRelation"
  />

  <EditRelationModal
    :opened="isEditRelationModalOpen"
    title="Modifier une relation"
    :relation="relationToEdit"
    @close="closeEditRelationModal"
    @update-relation="handleUpdateRelation"
  />

  <DeleteConfirmationModal :opened="showDeleteConfirmation" itemName="relations" @confirm="confirmDelete" @cancel="cancelDelete" />
</template>

<style scoped>
input[type="checkbox"] {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 2px solid var(--dsfr-border, #ccc);
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;
}
</style>
