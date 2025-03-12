<script setup lang="ts">
import useToaster from "@/composables/use-toaster";
import axios from "axios";
import { computed, defineProps, onMounted, ref } from "vue";
import { eventTypesDict } from "@/composables/use-dictionary";
import EventForm from "./form/EventForm.vue";
import useModal from "@/composables/use-modal";

const props = defineProps({
  application: {
    type: Object,
    required: true,
  },
  title: { type: String, default: "" },
  icon: { type: String, default: "" },
});

const toaster = useToaster();

const selectedEventIds = ref<string[]>([]);

const eventModal = useModal();
const showDeleteConfirmation = ref(false);

const isSubmitting = ref(false);
const currentPage = ref(0);

const loading = ref(true);

const events = ref([]);

async function createEvent(newEvent) {
  try {
    const eventToSend = {
      start: newEvent.start ? new Date(newEvent.start).toISOString() : undefined,
      end: newEvent.end ? new Date(newEvent.end).toISOString() : undefined,
      description: newEvent.description,
      type: newEvent.type,
    };
    eventModal.closeModal();
    await axios.post(`applications/${props.application.id}/events`, eventToSend);
    toaster.addSuccessMessage("Événement créé avec succès !");
    fetchEvents();
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la création de l'événement.");
  }
}

async function fetchEvents() {
  try {
    loading.value = true;
    const response = await axios.get(`applications/${props.application.id}/events`);
    events.value = response.data;
    loading.value = false;
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la récupération des évenements.");
  } finally {
    loading.value = false;
  }
}

async function deleteEvents(eventIds: String[]) {
  try {
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
      <DsfrButton type="button" class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-add-line" @click="eventModal.openCreateModal()">
        Ajouter un événement
      </DsfrButton>
    </div>
  </div>
  <div v-if="!loading && rows.length === 0" class="text-center">
    <p>Aucun événement enregistré.</p>
  </div>
  <div v-else>
    <div class="global-delete">
      <DsfrButton type="button" tertiary @click="removeSelectedEvents" icon="fr-icon-delete-line" :disabled="selectedEventIds.length === 0">
        Supprimer la sélection
      </DsfrButton>
    </div>
    <AppLoader v-if="loading"></AppLoader>
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
          {{ eventTypesDict[cell] || cell }}
        </template>
        <template v-else>
          {{ cell }}
        </template>
      </template>
    </DsfrDataTable>
  </div>

  <DsfrModal :opened="eventModal.isCreateModalOpen.value" :title="'Ajouter un événement'" @close="eventModal.closeModal">
    <EventForm v-bind="{ application }" :is-submitting="isSubmitting" @submit="createEvent" @cancel="eventModal.closeModal" />
  </DsfrModal>

  <DeleteConfirmationModal :opened="showDeleteConfirmation" itemName="événements" @confirm="confirmDelete" @cancel="cancelDelete" />
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
