<script setup lang="ts">
import { ref, computed, onBeforeMount } from "vue";
import { defineProps, defineEmits } from "vue";
import useToaster from "@/composables/use-toaster";
import useModal from "@/composables/use-modal";
import { useActorStore } from "@/stores/actorStore";
import { useOrganizationStore } from "@/stores/organizationStore";
import { useActorTypeStore } from "@/stores/actorTypeStore";
import ActorForm from "./ActorForm.vue";

import type { Actor } from "@/models/Actor";
import type { Application } from "@/models/Application";
import { useUserStore } from "@/stores/userStore";

const props = defineProps<{ application: Application }>();
const emit = defineEmits(["update:application"]);

const actorStore = useActorStore();
const userStore = useUserStore();
const actorTypeStore = useActorTypeStore();
const toaster = useToaster();
const actorModal = useModal();

const selectedActorIds = ref<string[]>([]);
const currentPage = ref(0);
const showDeleteConfirmation = ref(false);
const isSubmitting = ref(false);
const loading = ref(false);

const headers = ["Sélection", "Organisation", "Type", "Email", "Prénom", "Nom", "Actions"];

const actorTypesList = computed(() => actorTypeStore.actorTypes);

const tableRows = computed(() =>
  actorStore.actors.map((actor) => [
    actor.id,
    actor.organizationId ?? undefined,
    (() => {
      const type = actorTypesList.value.find((t) => t.id === actor.actorTypeId);
      return type ? type.label : "Type inconnu";
    })(),
    {
      label: actor.email || "",
      to: actor.email ? `mailto:${actor.email}` : "",
    },
    actor.firstname || "",
    actor.lastname || "",
    {
      component: "DsfrButton",
      label: "Modifier",
      onClick: () => actorModal.openModal(actor),
    },
  ]),
);

onBeforeMount(async () => {
  await actorTypeStore.fetchAll();
});

async function handleSaveActors(actor: Actor) {
  loading.value = true;
  actorModal.closeModal();

  try {
    await actorStore.saveActor(actor);
    await actorStore.fetchActorsByApplication(props.application.id);
    toaster.addSuccessMessage("Acteur sauvegardé avec succès !");
    emit("update:application", props.application);
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la sauvegarde de l’acteur.");
    console.error("❌ Erreur handleSaveActors :", error.response?.data || error);
  } finally {
    loading.value = false;
  }
}

async function confirmDelete() {
  const actorsToDelete = actorStore.actors.filter((actor) => selectedActorIds.value.includes(actor.id));

  for (const actor of actorsToDelete) {
    await actorStore.deleteActor(actor.id, props.application.id);
  }

  await actorStore.fetchActorsByApplication(props.application.id);
  selectedActorIds.value = [];
  showDeleteConfirmation.value = false;
  toaster.addSuccessMessage("Acteurs supprimés avec succès !");
  emit("update:application", props.application);
}

function removeSelectedActors() {
  if (selectedActorIds.value.length === 0) {
    toaster.addErrorMessage("Aucune sélection.");
    return;
  }
  showDeleteConfirmation.value = true;
}

function cancelDelete() {
  showDeleteConfirmation.value = false;
}
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
    <div class="fr-col">
      <h3 class="fr-mb-0">Gestion des acteurs</h3>
    </div>
    <div class="fr-col-auto">
      <DsfrButton
        type="button"
        class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-add-line"
        @click="actorModal.openCreateModal()"
        :disabled="!userStore.userPermissions?.includes('write')"
      >
        Ajouter un acteur
      </DsfrButton>
    </div>
  </div>

  <div v-if="!loading && tableRows.length === 0" class="text-center">
    <p>Aucun acteur enregistré.</p>
  </div>

  <div v-else>
    <div class="global-delete">
      <DsfrButton
        type="button"
        tertiary
        @click="removeSelectedActors"
        icon="fr-icon-delete-line"
        :disabled="selectedActorIds.length === 0 || !userStore.userPermissions?.includes('write')"
      >
        Supprimer la sélection
      </DsfrButton>
    </div>

    <AppLoader v-if="loading" />

    <DsfrDataTable
      v-else
      v-model:selection="selectedActorIds"
      v-model:current-page="currentPage"
      :headers-row="headers"
      :rows="tableRows"
      row-key="id"
      title="Liste des acteurs associés"
      pagination
      :rows-per-page="5"
      :pagination-options="[5, 10, 20, 30]"
      bottom-action-bar-class="bottom-action-bar-class"
      pagination-wrapper-class="pagination-wrapper-class"
      sorted="id"
      :sortable-rows="['id']"
    >
      <template #cell="{ colKey, cell }">
        <template v-if="colKey === 'Sélection'">
          <input type="checkbox" :value="cell" v-model="selectedActorIds" />
        </template>
        <template v-else-if="colKey === 'Organisation'">
          <OrgBreadCrumb v-if="cell" :organization-id="cell"></OrgBreadCrumb>
          <template v-else>Aucune organisation</template>
        </template>
        <template v-else-if="colKey === 'Email'">
          <a :href="cell.to" target="_blank" rel="noopener noreferrer">
            {{ cell.label }}
          </a>
        </template>
        <template v-else-if="colKey === 'Actions'">
          <DsfrButton
            tertiary
            size="sm"
            icon="fr-icon-edit-line"
            @click="cell.onClick"
            :disabled="!userStore.userPermissions?.includes('write')"
          >
            {{ cell.label }}
          </DsfrButton>
        </template>
        <template v-else-if="colKey === 'Type' || colKey === 'Organisation'">
          <span class="truncate" :title="cell">{{ cell }}</span>
        </template>
        <template v-else>
          {{ cell }}
        </template>
      </template>
    </DsfrDataTable>
  </div>

  <DsfrModal
    :opened="actorModal.isModalOpen.value || actorModal.isCreateModalOpen.value"
    :title="actorModal.isCreateModalOpen.value ? 'Ajouter un acteur' : 'Modifier l\'acteur'"
    @close="actorModal.closeModal"
  >
    <ActorForm
      v-bind="{ application, initialData: actorModal.selectedItem.value }"
      :is-submitting="isSubmitting"
      :actorTypes="actorTypesList"
      @submit="handleSaveActors"
      @cancel="actorModal.closeModal"
    />
  </DsfrModal>

  <DeleteConfirmationModal :opened="showDeleteConfirmation" itemName="acteurs" @confirm="confirmDelete" @cancel="cancelDelete" />
</template>

<style scoped>
input[type="checkbox"] {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 2px solid var(--dsfr-border, #ccc);
  position: relative;
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;
}

.truncate {
  display: inline-block;
  max-width: 230px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
