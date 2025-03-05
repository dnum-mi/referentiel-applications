<script setup lang="ts">
import { ref, watch } from "vue";
import Applications from "@/api/application";
import type { Actor } from "@/models/Application";
import useToaster from "@/composables/use-toaster";
import { defineProps, defineEmits } from "vue";
import { actorTypeMapping } from "@/composables/use-dictionary";
import ActorForm from "./form/ActorForm.vue";
import useModal from "@/composables/use-modal";

const toaster = useToaster();

const props = defineProps({
  application: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["update:application"]);

const localActors = ref<Actor[]>(Array.isArray(props.application.actors) ? [...props.application.actors] : []);
const selectedActorIds = ref<string[]>([]);

const currentPage = ref<number>(0);
const headers = ["Sélection", "Email", "Type", "Actions"];
const rows = ref<(string | { component: string; [k: string]: unknown })[][]>([]);

const actorModal = useModal();
const showDeleteConfirmation = ref(false);

const isSubmitting = ref(false);
const loading = ref(false);

function getTypeLabel(value: string): string {
  return value ? actorTypeMapping[value] || "Type inconnu" : "Aucun type sélectionné";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const handleSaveActors = (newActor) => {
  const index = localActors.value.findIndex((actor) => actor.id === newActor.id);
  if (index !== -1) {
    localActors.value[index] = { ...localActors.value[index], ...newActor };
  } else {
    localActors.value.push({ ...newActor });
  }
  saveAll();
};

async function saveAll() {
  for (const actor of localActors.value) {
    if (!actor.email.trim()) {
      toaster.addErrorMessage("L'email est requis pour tous les acteurs.");
      return;
    }
    if (!isValidEmail(actor.email)) {
      toaster.addErrorMessage("Veuillez entrer une adresse email valide pour tous les acteurs.");
      return;
    }
  }
  const existingIds = new Set((props.application.actors || []).map((a: Actor) => a.id));
  const actorsToSave = localActors.value.map((actor) => (existingIds.has(actor.id) ? actor : { ...actor, id: actor.id ?? undefined }));
  console.log(actorsToSave);

  loading.value = true;
  try {
    await Applications.patchApplication({
      ...props.application,
      actors: actorsToSave,
    });
    emit("update:application", {
      ...props.application,
      actors: actorsToSave,
    });
    toaster.addSuccessMessage("Acteurs sauvegardés avec succès !");
    actorModal.closeModal();
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la sauvegarde des acteurs.");
  } finally {
    loading.value = false;
  }
}

function removeSelectedActors() {
  if (selectedActorIds.value.length === 0) {
    toaster.addErrorMessage("Aucune sélection.");
    return;
  }
  showDeleteConfirmation.value = true;
}

function confirmDelete() {
  localActors.value = localActors.value.filter((actor) => !selectedActorIds.value.includes(actor.id));
  selectedActorIds.value = [];
  saveAll();
  showDeleteConfirmation.value = false;
}

function cancelDelete() {
  showDeleteConfirmation.value = false;
}

rows.value = localActors.value.map((actor: any) => [
  actor.id,
  {
    label: actor.email || "Email vide",
    to: actor.email ? `mailto:${actor.email}` : "",
  },
  getTypeLabel(actor.actorType) || "Type inconnu",
  {
    component: "DsfrButton",
    label: "Modifier",
    onClick: () => actorModal.openModal(actor),
  },
]);

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
    rows.value = localActors.value.map((actor) => [
      actor.id,
      {
        label: actor.email || "Email vide",
        to: actor.email ? `mailto:${actor.email}` : "",
      },
      getTypeLabel(actor.actorType) || "Type inconnu",
      {
        component: "DsfrButton",
        label: "Modifier",
        onClick: () => actorModal.openModal(actor),
      },
    ]);
  },
  { deep: true },
);
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
  <div v-if="rows.length === 0" class="text-center">
    <p>Aucun acteur enregistré.</p>
  </div>
  <div v-else>
    <div class="global-delete">
      <DsfrButton type="button" tertiary @click="removeSelectedActors" icon="fr-icon-delete-line" :disabled="selectedActorIds.length === 0">
        Supprimer la sélection
      </DsfrButton>
    </div>
    <DsfrDataTable
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

  <GenericModal
    :opened="actorModal.isModalOpen.value || actorModal.isCreateModalOpen.value"
    :title="actorModal.isCreateModalOpen.value ? 'Ajouter un acteur' : 'Modifier l\'acteur'"
    :formComponent="ActorForm"
    :formProps="{ application, initialData: actorModal.selectedItem.value }"
    :is-submitting="isSubmitting"
    @submit="handleSaveActors"
    @cancel="actorModal.closeModal"
  />

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
