<script setup lang="ts">
import { useRelationManager, type RelationRow } from "@/composables/use-relation-manager";
import type { ApplicationWithPerms } from "@/models/Application";
import { useRelationStore } from "@/stores/relationStore";
import { useToasterStore } from "@/stores/toasterStore";
import { useUserStore } from "@/stores/userStore";
import type { TableColumn } from "@/types/table";
import { computed, ref } from "vue";
import RefAppTable from "./RefAppTable.vue";
import RelationshipGraph from "./RelationShipGraph.vue";
import { Permission, type RelationDto } from "@/client";

defineOptions({ inheritAttrs: false });

const props = defineProps<{ application: ApplicationWithPerms; isMobile?: boolean }>();

const isLoading = ref(false);
const userStore = useUserStore();
const canEdit = computed(() => userStore.hasPermissions([Permission.RELATION_WRITE], Array.from(props.application.myPerms)));
const toaster = useToasterStore();

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
  handleUpdateRelation,
} = relationManager;

// Convert headers array to TableColumn[] and normalize field names
const fieldMap: Record<string, string> = {
  Sélection: "selection",
  "Application Source": "applicationSource",
  Relation: "relation",
  "Application Cible": "applicationCible",
  "Mediation Service": "mediationService",
  Actions: "actions",
};

const tableColumns: TableColumn[] = headers.map((header: string) => ({
  field: fieldMap[header] || header,
  header: header,
  sortable: !["Sélection", "Actions"].includes(header),
}));

const normalizedRows = computed(() =>
  rows.value.map((row) => ({
    selection: row.Sélection,
    applicationSource: row["Application Source"],
    relation: row.Relation,
    applicationCible: row["Application Cible"].label,
    applicationCibleId: row["Application Cible"].id,
    mediationService: row["Mediation Service"].label || "",
    mediationServiceId: row["Mediation Service"].id,
    actions: row.Actions,
    originalRow: row,
  })),
);

const isDeleteDisabled = computed(() => selectedRelationIds.value.length === 0);

const pageSize = ref(10);
const firstIndex = computed(() => currentPage.value * pageSize.value);

const viewMode = ref<"list" | "graph">("list");
function setViewMode(mode: "list" | "graph") {
  viewMode.value = mode;
}

// --- Boutons principaux ---
const mainButtons = computed(() =>
  props.isMobile
    ? []
    : [
        {
          label: "Liste",
          title: "Vue liste des relations",
          icon: "fr-icon-list-unordered",
          onClick: () => setViewMode("list"),
          tertiary: viewMode.value !== "list",
        },
        {
          label: "Graphe",
          title: "Vue graphe des relations",
          icon: "fr-icon-eye-line",
          onClick: () => setViewMode("graph"),
          tertiary: viewMode.value !== "graph",
        },
      ],
);

const addRelationButton = computed(() => ({
  label: "Ajouter une relation",
  icon: "fr-icon-add-line",
  onClick: onAddRelationClick,
  disabled: !canEdit.value,
}));

// --- Fonctions actions ---
function onAddRelationClick() {
  openAddRelationModal();
}
function onDeleteSelectedClick() {
  removeSelectedRelations();
}
function onEditRelation(row: RelationRow) {
  row.Actions.edit();
}
function onDeleteRelation(row: RelationRow) {
  row.Actions.delete();
}
function onAddRelation(relation: Pick<RelationDto, "type" | "mediationServiceId" | "applicationTargetId">) {
  handleCreateRelation({
    applicationTargetId: relation.applicationTargetId,
    type: relation.type,
    applicationSourceId: props.application.id,
    mediationServiceId: relation.mediationServiceId,
  });
}

function onPage(event: any) {
  currentPage.value = event.page;
  pageSize.value = event.rows;
}

const relationsStore = useRelationStore();

onMounted(async () => {
  isLoading.value = true;
  try {
    await relationsStore.fetchRelationsByApplication(props.application.id);
  } catch (error) {
    console.error(error);
    toaster.addErrorMessage("Erreur lors du chargement des relations.");
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <AppLoader v-if="isLoading" data-testid="relationship-loader" />
  <!-- Header avec boutons -->
  <div v-else class="fr-grid-row fr-grid-row--middle fr-mb-3w" v-bind="$attrs" data-testid="relations-header">
    <div class="fr-col">
      <h3 class="fr-mb-0">Gestion des relations</h3>
    </div>
    <div class="fr-col main-buttons-row" aria-hidden="false">
      <div>
        <DsfrButtonGroup :buttons="mainButtons" />
        <DsfrButton v-bind="addRelationButton" />
      </div>
    </div>
  </div>
  <!-- Graph View Desktop Only -->
  <div v-if="viewMode === 'graph' && !props.isMobile">
    <RelationshipGraph :application-id="props.application.id" />
  </div>

  <!-- List View -->
  <div v-else>
    <!-- Delete selected button -->
    <div v-if="!props.isMobile" class="global-delete" data-testid="relations-delete-container">
      <DsfrButton
        type="button"
        tertiary
        icon="fr-icon-delete-line"
        :disabled="isDeleteDisabled || !canEdit"
        data-testid="relation-delete-selected-btn"
        title="Supprimer les relations sélectionnées"
        aria-label="Supprimer la sélection"
        @click="onDeleteSelectedClick"
      >
        Supprimer la sélection
      </DsfrButton>
    </div>

    <!-- Empty state -->
    <div v-if="rows.length === 0" class="text-center" data-testid="relations-empty">
      <p>Aucune relation définie.</p>
    </div>

    <!-- Data table for desktop -->
    <div v-else-if="!props.isMobile">
      <RefAppTable
        :items="normalizedRows"
        :columns="tableColumns"
        :paginator="true"
        :rows="pageSize"
        :first="firstIndex"
        :total-records="normalizedRows.length"
        data-testid="relations-table"
        @page="onPage"
      >
        <template #body-selection="{ data }">
          <input
            v-model="selectedRelationIds"
            type="checkbox"
            :value="data.selection"
            :aria-label="`Sélectionner la relation ${data.applicationSource} - ${data.applicationCible.label} (${data.relation})`"
            :data-testid="`relation-row-select-${data.selection}`"
          />
        </template>

        <template #body-applicationCible="{ data }">
          <a :href="`/applications/${data.applicationCibleId}`" class="fr-link" data-testid="relation-target-link">
            {{ data.applicationCible }}
          </a>
        </template>

        <template #body-relation="{ data }">
          <DsfrTag
            v-if="data.relation"
            :label="String(data.relation)"
            small
            class="relation-type-tag"
            :data-testid="`relation-type-tag-${data.relation}`"
          />
          <template v-else>Type inconnu</template>
        </template>

        <template #body-mediationService="{ data }">
          <a
            v-if="data.mediationService && data.mediationServiceId"
            :href="`/applications/${data.mediationServiceId}`"
            class="fr-link"
            data-testid="relation-target-link"
          >
            {{ data.mediationService }}
          </a>
          <template v-else> - </template>
        </template>

        <template #body-actions="{ data }">
          <DsfrButton
            tertiary
            size="sm"
            icon="fr-icon-edit-line"
            :disabled="!canEdit"
            data-testid="relation-edit-btn"
            title="Modifier la relation"
            aria-label="Modifier la relation"
            @click="() => data.actions.edit()"
          >
            Modifier
          </DsfrButton>
        </template>
      </RefAppTable>
    </div>

    <!-- Mobile cards -->
    <div v-else class="relation-card-list">
      <div v-for="row in rows as RelationRow[]" :key="row.id" class="relation-card fr-mb-2w" data-testid="relation-card">
        <DsfrCard
          :title="row['Application Cible'].label || '—'"
          :description="row['Relation'] || ''"
          :title-link-attrs="{ 'data-testid': `relation-card-link-${row.id}` }"
          :link="`/applications/${row['Application Cible'].id}`"
          :buttons="[
            {
              label: 'Modifier',
              icon: 'fr-icon-edit-line',
              tertiary: true,
              size: 'sm',
              disabled: !canEdit,
              onClick: (event?: Event) => {
                event?.stopPropagation();
                onEditRelation(row);
              },
            },
            {
              label: 'Supprimer',
              icon: 'fr-icon-delete-line',
              tertiary: true,
              size: 'sm',
              disabled: !canEdit,
              onClick: (event?: Event) => {
                event?.stopPropagation();
                onDeleteRelation(row);
              },
            },
          ]"
          size="sm"
          :no-arrow="true"
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
                {{ row["Application Cible"].label }}
              </a>
            </div>
          </template>
        </DsfrCard>
      </div>
    </div>
  </div>

  <!-- Modals -->
  <AddRelationModal
    :opened="isAddRelationModalOpen"
    title="Ajouter une relation"
    :application-id="props.application.id"
    data-testid="relation-add-modal"
    @close="closeAddRelationModal"
    @add-relation="onAddRelation"
  />
  <EditRelationModal
    :opened="isEditRelationModalOpen"
    title="Modifier une relation"
    :relation="relationToEdit"
    data-testid="relation-edit-modal"
    @close="closeEditRelationModal"
    @update-relation="handleUpdateRelation"
  />
  <DeleteConfirmationModal
    :opened="showDeleteConfirmation"
    item-name="les relations sélectionnées"
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
}

.relation-card-list {
  display: flex;
  flex-direction: column;
}

.relation-type-tag {
  display: inline-block;
}
.main-buttons-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: flex-end;
}

.main-buttons-row > div {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.main-buttons-row .fr-btn,
.main-buttons-row .fr-btn-group,
.main-buttons-row .fr-btns {
  display: flex;
  align-items: center;
}
</style>
