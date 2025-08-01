<script setup lang="ts">
import { computed } from "vue";
import { useRelationManager } from "@/composables/use-relation-manager";
import type { ApplicationWithPerms } from "@/models/Application";
import { useUserStore } from "@/stores/userStore";
import { AdminLevel } from "@/models/user";

const props = defineProps<{ application: ApplicationWithPerms }>();

const userStore = useUserStore();
const canEdit = computed(() => userStore.adminLevel >= AdminLevel.WRITE || props.application.myPerms.has("writeRelations"));

const {
  headers,
  rows,
  selectedRelationIds,
  currentPage,
  showDeleteConfirmation,
  isAddRelationModalOpen,
  isEditRelationModalOpen,
  relationToEdit,
  removeSelectedRelations,
  confirmDelete,
  cancelDelete,
  openAddRelationModal,
  closeAddRelationModal,
  handleCreateRelation,
  closeEditRelationModal,
  handleUpdateRelation,
} = useRelationManager();
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
    <div class="fr-col">
      <h3 class="fr-mb-0">
        Gestion des relations de {{ props.application.label }}
      </h3>
    </div>
    <div class="fr-col-auto">
      <DsfrButton
        type="button"
        class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-add-line"
        :disabled="!canEdit"
        @click="openAddRelationModal"
      >
        Ajouter une relation
      </DsfrButton>
    </div>
  </div>

  <div class="global-delete">
    <DsfrButton
      type="button"
      tertiary
      icon="fr-icon-delete-line"
      :disabled="selectedRelationIds.length === 0 || !canEdit"
      @click="removeSelectedRelations"
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
        <input v-model="selectedRelationIds" type="checkbox" :value="cell">
      </template>
      <template v-else-if="colKey === 'Application Cible'">
        <a :href="`/applications/${cell.id}`" class="fr-link">
          {{ cell.label }}
        </a>
      </template>
      <template v-else-if="colKey === 'Actions'">
        <DsfrButton tertiary size="sm" icon="fr-icon-edit-line" :disabled="!canEdit" @click="cell.edit()">
          {{ cell.label }}
          Modifier
        </DsfrButton>
      </template>
      <template v-else>
        {{ cell }}
      </template>
    </template>
  </DsfrDataTable>

  <AddRelationModal
    :opened="isAddRelationModalOpen"
    title="Ajouter une relation"
    :application-id="application.id"
    @close="closeAddRelationModal"
    @add-relation="
      (relation) =>
        handleCreateRelation({
          applicationTargetId: relation.targetId,
          type: relation.type,
          applicationSourceId: application.id,
        })
    "
  />

  <EditRelationModal
    :opened="isEditRelationModalOpen"
    title="Modifier une relation"
    :relation="relationToEdit"
    @close="closeEditRelationModal"
    @update-relation="handleUpdateRelation"
  />

  <DeleteConfirmationModal :opened="showDeleteConfirmation" item-name="relations" @confirm="confirmDelete" @cancel="cancelDelete" />
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
