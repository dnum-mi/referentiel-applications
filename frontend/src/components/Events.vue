<script setup lang="ts">
import useToaster from "@/composables/use-toaster";
import axios from "axios";
import { computed, defineProps, onMounted, ref } from "vue";

const props = defineProps({
  application: {
    type: Object,
    required: true,
  },
  title: { type: String, default: "" },
  icon: { type: String, default: "" },
});

const toaster = useToaster();

const selectedEvent = ref<Event | null>(null);
const selectedEventIds = ref<string[]>([]);

const isEventModalOpen = ref(false);
const isCreateEventModalOpen = ref(false);
const showDeleteConfirmation = ref(false);

const isSubmitting = ref(false);
const currentPage = ref<number>(0);

const events = ref([]);
const event = ref({
  start: undefined as string | undefined,
  end: undefined as string | undefined,
  type: "under_construction",
  description: "",
});

async function createEvent(newEvent) {
  try {
    event.value.start = newEvent.start ? new Date(newEvent.start).toISOString() : undefined;
    event.value.end = newEvent.end ? new Date(newEvent.end).toISOString() : undefined;
    event.value.description = newEvent.description;
    event.value.type = newEvent.type;

    await axios.post(`applications/${props.application.id}/events`, event.value);
    toaster.addSuccessMessage("Événement créé avec succès !");
    closeCreateEventModal();
    fetchEvents();
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la création de l'événement.");
  }
}

async function fetchEvents() {
  try {
    const response = await axios.get(`applications/${props.application.id}/events`);
    events.value = response.data;
    console.log(events.value);
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la récupération des évenements.");
  }
}

async function deleteEvents(eventIds: String[]) {
  try {
    console.log("Suppression des événements :", eventIds);

    // Utilisation de Promise.all pour exécuter toutes les requêtes en parallèle
    await Promise.all(eventIds.map((eventId) => axios.delete(`applications/${props.application.id}/events/${eventId}`)));

    toaster.addSuccessMessage("Événements supprimés avec succès !");
    fetchEvents();
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la suppression des événements.");
  }
}

onMounted(fetchEvents);

const headers = [
  { key: "selection", label: "Sélection" },
  { key: "start", label: "Début" },
  { key: "end", label: "Fin" },
  { key: "type", label: "Type" },
  { key: "description", label: "Description" },
];

const rows = computed(() => {
  return events.value.map((event) => [
    event.id || "",
    new Date(event.start).toLocaleDateString("fr-FR") || "",
    new Date(event.end).toLocaleDateString("fr-FR") || "",
    event.type,
    event.description || "",
  ]);
});

function click(event: MouseEvent, key: string) {
  console.warn(event, key);
}

const eventTypes = [
  { value: "under_construction", text: "En construction" },
  { value: "in_production", text: "En production" },
  { value: "decommissioned", text: "Déclassé" },
  { value: "decommissioning", text: "Déclassement" },
  { value: "highlight", text: "Évenement" },
];

const toggleEventModal = (type, event = null) => {
  selectedEvent.value = event ? { ...event } : null;

  isEventModalOpen.value = type === "view";
  isCreateEventModalOpen.value = type === "create";
};

const openCreateEventModal = () => toggleEventModal("create");
const closeCreateEventModal = () => toggleEventModal("close");

function removeSelectedEvents() {
  if (selectedEventIds.value.length === 0) {
    toaster.addErrorMessage("Aucune sélection.");
    return;
  }
  showDeleteConfirmation.value = true;
}

function confirmDelete() {
  if (selectedEventIds.value) {
    deleteEvents(selectedEventIds.value);
    showDeleteConfirmation.value = false;
    selectedEventIds.value = [];
  }
}

function cancelDelete() {
  showDeleteConfirmation.value = false;
}
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
    <div class="fr-col">
      <h3 class="fr-mb-0">Gestions des événements</h3>
    </div>
    <div class="fr-col-auto">
      <DsfrButton type="button" class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-add-line" @click="openCreateEventModal()">
        Ajouter un événement
      </DsfrButton>
    </div>
  </div>
  <div class="global-delete">
    <DsfrButton type="button" tertiary @click="removeSelectedEvents" icon="fr-icon-delete-line" :disabled="selectedEventIds.length === 0">
      Supprimer la sélection
    </DsfrButton>
  </div>
  <div v-if="rows.length === 0" class="text-center">
    <p>Aucun événement enregistré.</p>
  </div>
  <DsfrDataTable
    v-else
    v-model:selection="selectedEventIds"
    v-model:current-page="currentPage"
    title="Liste des événements associés"
    :headers-row="headers"
    pagination
    :rows-per-page="5"
    :pagination-options="[5, 10, 20, 30]"
    bottom-action-bar-class="bottom-action-bar-class"
    pagination-wrapper-class="pagination-wrapper-class"
    :rows="rows"
    sortable-rows
    :row-key="4"
  >
    <template #header="{ key, label }">
      <div @click="click($event, key)">
        {{ label }}
      </div>
    </template>

    <template #cell="{ colKey, cell }">
      <template v-if="colKey === 'selection'">
        <input type="checkbox" :value="cell" v-model="selectedEventIds" />
      </template>
      <template v-else-if="colKey === 'type'">
        {{ eventTypes.find((type) => type.value === cell)?.text || cell }}
      </template>
      <template v-else>
        {{ cell }}
      </template>
    </template>
  </DsfrDataTable>

  <DsfrModal :opened="isCreateEventModalOpen" title="Ajouter un lien" size="lg" @close="closeCreateEventModal">
    <EventForm
      v-if="application"
      :application="application"
      :is-submitting="isSubmitting"
      @submit="createEvent"
      @cancel="closeCreateEventModal"
    />
  </DsfrModal>

  <DsfrModal :opened="showDeleteConfirmation" title="Confirmation de suppression" size="sm" @close="cancelDelete">
    <p>Êtes-vous sûr de vouloir supprimer l'événement sélectionné ? Cette action est irréversible.</p>
    <div class="actions">
      <DsfrButton type="button" @click="cancelDelete" tertiary>Annuler</DsfrButton>
      <DsfrButton type="button" @click="confirmDelete" primary>Confirmer</DsfrButton>
    </div>
  </DsfrModal>
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
