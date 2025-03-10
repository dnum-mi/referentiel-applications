<script setup lang="ts">
import { ref, computed, watch, reactive } from "vue";
import type { Application, Relation } from "@/models/Application";
import AddRelationModal from "@/components/AddRelationModal.vue";
import useToaster from "@/composables/use-toaster";

interface TableRow {
  id: string;
  Source: string;
  Relation: string;
  Cible: string;
}

const toaster = useToaster();
const emit = defineEmits<{
  (e: "update:application", updatedApp: Application): void;
}>();

const props = defineProps<{
  application: Application;
}>();

const localApplication = reactive({ ...props.application });

watch(
  () => props.application,
  (newApp) => {
    Object.assign(localApplication, newApp);
  },
);

const headers = ["Source", "Relation", "Cible"];

const relationTypes: Record<string, { source: string; target: string }> = {
  is_part_of: { source: "Fait partie de", target: "Contient" },
  in_replacement_of: { source: "Remplace", target: "Remplace" },
  is_service_user_of: { source: "Utilise le service de", target: "Utilise le service à" },
  is_data_user_of: { source: "Utilise la donnée de", target: "Utilise la donnée à" },
};

const getRelationLabelForSide = (type: string, isSource: boolean): string =>
  relationTypes[type] ? (isSource ? relationTypes[type].source : relationTypes[type].target) : type;

const createRow = (rel: Relation, isSource: boolean): TableRow => {
  const label = getRelationLabelForSide(rel.type, isSource);
  if (isSource) {
    return {
      id: rel.id,
      Source: localApplication.label,
      Relation: label,
      Cible: rel.targetApplication?.label || "Label manquant",
    };
  } else {
    return {
      id: rel.id,
      Source: rel.sourceApplication?.label || "Label manquant",
      Relation: label,
      Cible: localApplication.label,
    };
  }
};

const allRelations = computed(() => [
  ...(localApplication.relationsAsSource?.map((rel) => ({ ...rel, isSource: true })) || []),
  ...(localApplication.relationsAsTarget?.map((rel) => ({ ...rel, isSource: false })) || []),
]);

const rows = computed(() => {
  return allRelations.value.map((rel) => createRow(rel, rel.isSource));
});

const selectedRelationIds = ref<string[]>([]);
const currentPage = ref<number>(0);

const isAddRelationModalOpen = ref(false);
const openAddRelationModal = () => {
  isAddRelationModalOpen.value = true;
};
const closeAddRelationModal = () => {
  isAddRelationModalOpen.value = false;
};

const handleAddRelation = (updatedApp: Application) => {
  Object.assign(localApplication, {
    ...updatedApp,
    relationsAsSource: updatedApp.relationsAsSource ?? localApplication.relationsAsSource,
    relationsAsTarget: updatedApp.relationsAsTarget ?? localApplication.relationsAsTarget,
  });
  emit("update:application", localApplication);
};

const handleAddRelationPayload = (payload: { target: Application; relationType: string }) => {
  const relationAlreadyExists =
    (localApplication.relationsAsSource ?? []).some(
      (rel) => rel.targetApplication?.id === payload.target.id && rel.type === payload.relationType,
    ) ||
    (localApplication.relationsAsTarget ?? []).some(
      (rel) => rel.sourceApplication?.id === payload.target.id && rel.type === payload.relationType,
    );

  if (relationAlreadyExists) {
    toaster.addErrorMessage(
      `La relation ${relationTypes[payload.relationType]?.source || payload.relationType} avec ${payload.target.label} existe déjà.`,
    );
    return;
  }

  const newRelation: Relation = {
    id: `temp-${Date.now()}`,
    type: payload.relationType,
    targetApplication: payload.target,
  } as Relation;

  if (!localApplication.relationsAsSource) {
    localApplication.relationsAsSource = [];
  }
  localApplication.relationsAsSource.push(newRelation);
};
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
    <div class="fr-col">
      <h3 class="fr-mb-0">Gestion des relations</h3>
    </div>
    <div class="fr-col-auto">
      <DsfrButton type="button" class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-add-line" @click="openAddRelationModal">
        Ajouter une relation
      </DsfrButton>
    </div>
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
    row-key="id"
    title="Liste des relations associées"
    pagination
    :rows-per-page="5"
    :pagination-options="[5, 10, 20, 30]"
    sorted="id"
    :sortable-rows="['id']"
  >
  </DsfrDataTable>

  <AddRelationModal
    :opened="isAddRelationModalOpen"
    title="Ajouter une relation"
    :applicationId="localApplication.id"
    @close="closeAddRelationModal"
    @update:application="handleAddRelation"
    @add-relation="handleAddRelationPayload"
  />
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
