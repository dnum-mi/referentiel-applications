<script setup lang="ts">
import { computed } from "vue";
// Importer le type RelationRow exposé par le composable
import { useRelationManager, type RelationRow } from "@/composables/use-relation-manager";
import type { ApplicationWithPerms } from "@/models/Application";
import { useUserStore } from "@/stores/userStore";
import { AdminLevel } from "@/models/user";


const props = defineProps<{
  application: ApplicationWithPerms,
  isMobile?: boolean,
}>();

const userStore = useUserStore();
const canEdit = computed(() => userStore.adminLevel >= AdminLevel.WRITE || props.application.myPerms.has("writeRelations"));

const relationManager = useRelationManager(props.application.id);

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
  handleUpdateRelation
} = relationManager;


const isDeleteDisabled = computed(() => {
  return selectedRelationIds.value.length === 0;
});


</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w" data-testid="relations-header">
    <div class="fr-col">
      <h3 class="fr-mb-0">Gestion des relations</h3>
    </div>
    <div class="fr-col-auto">
      <DsfrButton
        class="fr-btn--icon-left fr-icon-add-line"
        data-testid="relation-add-btn"
        :disabled="!canEdit"
        @click="openAddRelationModal"
      >
        Ajouter une relation
      </DsfrButton>
    </div>
  </div>

  <div v-if="!props.isMobile" class="global-delete" data-testid="relations-delete-container">
    <DsfrButton
      type="button"
      tertiary
      icon="fr-icon-delete-line"
      :disabled="isDeleteDisabled || !canEdit"
      data-testid="relation-delete-selected-btn"
      title="Supprimer les relations sélectionnées"
      aria-label="Supprimer la sélection"
      @click="removeSelectedRelations"
    >
      Supprimer la sélection
    </DsfrButton>
  </div>

  <div v-if="rows.length === 0" class="text-center" data-testid="relations-empty">
    <p>Aucune relation définie.</p>
  </div>

  <template v-else>
    <div v-if="!props.isMobile">
      <DsfrDataTable
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
        data-testid="relations-table"
      >
        <template #cell="{ colKey, cell }">
          <template v-if="colKey === 'Sélection'">
            <input v-model="selectedRelationIds" type="checkbox" :value="cell" />
          </template>

          <template v-else-if="colKey === 'Application Cible'">
            <a :href="`/applications/${cell.id}`" class="fr-link" data-testid="relation-target-link">
              {{ cell.label }}
            </a>
          </template>

          <template v-else-if="colKey === 'Relation'">
            <DsfrTag v-if="cell" :label="String(cell)" small class="relation-type-tag" :data-testid="`relation-type-tag-${cell}`" />
            <template v-else>Type inconnu</template>
          </template>

          <template v-else-if="colKey === 'Actions'">
            <DsfrButton tertiary size="sm" icon="fr-icon-edit-line" :disabled="!canEdit" data-testid="relation-edit-btn" title="Modifier la relation" aria-label="Modifier la relation" @click="cell.edit">
              Modifier
            </DsfrButton>
          </template>

          <template v-else>
            {{ cell }}
          </template>
        </template>
      </DsfrDataTable>
    </div>

    <div v-else class="relation-card-list">
      <div
        v-for="row in (rows as RelationRow[])"
        :key="row.id"
        class="relation-card fr-mb-2w"
        data-testid="relation-card"
      >
        <DsfrCard
          :title="row['Application Cible'].label || '—'"
          :titleLinkAttrs="{ 'data-testid': `relation-card-link-${row.id}` }"
          :link="`/applications/${row['Application Cible'].id}`"
          :description="''"
          :buttons="[
            {
              label: 'Modifier',
              icon: 'fr-icon-edit-line',
              tertiary: true,
              size: 'sm' as const,
              disabled: !canEdit,
              title: 'Modifier la relation',
              onClick: (event?: Event) => {
                event?.stopPropagation();
                row.Actions.edit(); 
              },
            },
            {
              label: 'Supprimer',
              icon: 'fr-icon-delete-line',
              tertiary: true,
              size: 'sm' as const,
              disabled: !canEdit,
              title: 'Supprimer la relation',
              onClick: (event?: Event) => {
                event?.stopPropagation();
                row.Actions.delete(); 
              },
            },
          ]"
          size="sm"
          :noArrow="true"
          class="fr-p-0"
          :data-testid="`relation-card-${row.id}`"
        >
          <template #start-details>
            <DsfrTag
              :label="row['Relation'] || 'Type inconnu'"
              small
              class="fr-mr-2w relation-type-tag"
              :data-testid="`relation-type-tag-${row.id}`"
            />
          </template>

          <template #end-details>
            <div class="fr-text--sm">
              <strong>Application Cible: </strong>
              <a :href="`/applications/${row['Application Cible'].id}`" class="fr-link" data-testid="relation-target-link">
                {{ row['Application Cible'].label }}
              </a>
            </div>
          </template>
        </DsfrCard>
      </div>
    </div>
  </template>

  <AddRelationModal
    :opened="isAddRelationModalOpen"
    title="Ajouter une relation"
    :application-id="props.application.id"
    data-testid="relation-add-modal"
    @close="closeAddRelationModal"
    @addRelation="
      (relation) =>
        handleCreateRelation({
          applicationTargetId: relation.targetId,
          type: relation.type,
          applicationSourceId: props.application.id,
        })
    "
  />

  <EditRelationModal
    :opened="isEditRelationModalOpen"
    title="Modifier une relation"
    :relation="relationToEdit"
    data-testid="relation-edit-modal"
    @close="closeEditRelationModal"
    @updateRelation="handleUpdateRelation"
  />

  <DeleteConfirmationModal
    :opened="showDeleteConfirmation"
    item-name="relations"
    data-testid="relation-delete-modal"
    @confirm="confirmDelete"
    @cancel="cancelDelete"
  />
</template>

<style scoped>

input[type="checkbox"] {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 2px solid var(--dsfr-border, #ccc);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.relation-card-list {
  display: flex;
  flex-direction: column;
}

.relation-type-tag {
  display: inline-block;
}
</style>