<script setup lang="ts">
import { ref, watch } from "vue";
import useToaster from "@/composables/use-toaster";
import { defineProps, defineEmits } from "vue";
import { actorTypeMapping } from "@/composables/use-dictionary";
import ActorForm from "./form/ActorForm.vue";
import useModal from "@/composables/use-modal";
import Organizations from "@/api/organization";
import Actors from "@/api/actor";
import { Actor } from "@/models/Actor.js";
import { Organization } from "@/models/organization";

const toaster = useToaster();

const props = defineProps({
  application: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["update:actor"]);

const localActors = ref<Actor[]>(Array.isArray(props.application.actors) ? [...props.application.actors] : []);
const selectedActorIds = ref<string[]>([]);

const currentPage = ref(0);
const headers = ["Sélection", "Organisation", "Type", "Email", "Prénom", "Nom", "Actions"];
const rows = ref<(string | { component: string; [k: string]: unknown })[][]>([]);

const actorModal = useModal();
const showDeleteConfirmation = ref(false);

const isSubmitting = ref(false);
const loading = ref(false);

const organizationsList = ref([]);

function getTypeLabel(value: string): string {
  return value ? actorTypeMapping[value] || "Type inconnu" : "Aucun type sélectionné";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function handleSaveActors(newActor) {
  const index = localActors.value.findIndex((actor) => actor.id === newActor.id);
  if (index !== -1) {
    localActors.value[index] = { ...localActors.value[index], ...newActor };
  } else {
    localActors.value.push({ ...newActor });
  }

  loading.value = true;
  actorModal.closeModal();

  if (newActor.id) {
    await Actors.update(newActor);
  } else {
    await Actors.create(newActor, props.application.id);
  }
  toaster.addSuccessMessage("Acteurs sauvegardés avec succès !");
  loading.value = false;
}

function removeSelectedActors() {
  if (selectedActorIds.value.length === 0) {
    toaster.addErrorMessage("Aucune sélection.");
    return;
  }
  showDeleteConfirmation.value = true;
}

async function confirmDelete() {
  localActors.value = localActors.value.filter((actor) => !selectedActorIds.value.includes(actor.id));

  selectedActorIds.value.forEach((actor) => {
    Actors.delete(actor);
  });

  selectedActorIds.value = [];
  showDeleteConfirmation.value = false;
}

function cancelDelete() {
  showDeleteConfirmation.value = false;
}

rows.value = localActors.value.map((actor) => [
  actor.id,
  (() => {
    const org = organizationsList.value.flat().find((o) => o.id === actor.organizationId);
    return org ? org.label : "Organisation inconnue";
  })(),
  getTypeLabel(actor.type) || "Type inconnu",
  {
    label: actor.email || "Email vide",
    to: actor.email ? `mailto:${actor.email}` : "",
  },
  actor.firstname || "Prénom vide",
  actor.lastname || "Nom vide",
  {
    component: "DsfrButton",
    label: "Modifier",
    onClick: () => actorModal.openModal(actor),
  },
]);

async function loadOrganization() {
  organizationsList.value = await Organizations.getOrganizations();

  updateRows();
}

const updateRows = () => {
  rows.value = localActors.value.map((actor) => [
    actor.id,
    (() => {
      const org = organizationsList.value.flat().find((o) => o.id === actor.organizationId);
      return org ? org.label : "Organisation inconnue";
    })(),
    getTypeLabel(actor.type) || "Type inconnu",
    {
      label: actor.email || "Email vide",
      to: actor.email ? `mailto:${actor.email}` : "",
    },
    actor.firstname || "Prénom vide",
    actor.lastname || "Nom vide",
    {
      component: "DsfrButton",
      label: "Modifier",
      onClick: () => actorModal.openModal(actor),
    },
  ]);
};

watch(
  () => props.application.actors,
  (newVal) => {
    localActors.value = Array.isArray(newVal) ? [...newVal] : [];
  },
  { deep: true, immediate: true },
);
watch(
  localActors,
  () => {
    updateRows();
  },
  { deep: true },
);

onBeforeMount(() => {
  loadOrganization();
});
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
    <div class="fr-col">
      <h3 class="fr-mb-0">Gestion des acteurs</h3>
    </div>
    <div class="fr-col-auto">
      <DsfrButton type="button" class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-add-line" @click="actorModal.openCreateModal()">
        Ajouter un acteur
      </DsfrButton>
    </div>
  </div>
  <div v-if="!loading && rows.length === 0" class="text-center">
    <p>Aucun acteur enregistré.</p>
  </div>
  <div v-else>
    <div class="global-delete">
      <DsfrButton type="button" tertiary @click="removeSelectedActors" icon="fr-icon-delete-line" :disabled="selectedActorIds.length === 0">
        Supprimer la sélection
      </DsfrButton>
    </div>
    <AppLoader v-if="loading"></AppLoader>
    <DsfrDataTable
      v-else
      v-model:selection="selectedActorIds"
      v-model:current-page="currentPage"
      :headers-row="headers"
      :rows="rows"
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
        <template v-else-if="colKey === 'Email'">
          <a :href="cell.to" target="_blank" rel="noopener noreferrer">
            {{ cell.label }}
          </a>
        </template>
        <template v-else-if="colKey === 'Actions'">
          <DsfrButton tertiary size="sm" icon="fr-icon-edit-line" @click="cell.onClick">{{ cell.label }}</DsfrButton>
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
      :organizations="organizationsList"
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
</style>
