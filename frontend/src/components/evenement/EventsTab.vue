<script setup lang="ts">
import { computed, defineProps, onMounted, ref } from "vue";
import { eventTypesDict } from "@/composables/use-dictionary";
import useToaster from "@/composables/use-toaster";
import useModal from "@/composables/use-modal";
import { useEventStore } from "@/stores/EventStore";
import EventForm from "./EventForm.vue";
import { customSorter } from "@/utils/tableSort";
import Users from "@/api/user";

const props = defineProps({
  application: {
    type: Object,
    required: true,
  },
});

const eventStore = useEventStore();
const events = computed(() => eventStore.events);
const loading = computed(() => eventStore.isLoading);

const toaster = useToaster();
const eventModal = useModal();

const selectedEventIds = ref<string[]>([]);
const showDeleteConfirmation = ref(false);
const isSubmitting = ref(false);
const currentPage = ref(0);
const userPermissions = ref(null);

const currentSortedColumn = ref("");

onMounted(async () => {
  eventStore.fetchEvents(props.application.id);
  userPermissions.value = await Users.getUser().then((response) => {
    return response.permissions.split(",");
  });
});

const headers = [
  { key: "selection", label: "Sélection" },
  { key: "start", label: "Début" },
  { key: "end", label: "Fin" },
  { key: "type", label: "Type" },
  { key: "description", label: "Description" },
];

const rows = computed(() =>
  events.value.map((event) => [
    event.id || "",
    new Date(event.start).toLocaleDateString("fr-FR") || "",
    new Date(event.end).toLocaleDateString("fr-FR") || "",
    event.type,
    event.description || "",
  ]),
);

async function handleCreateEvent(newEvent) {
  await eventStore.createEvent(props.application.id, newEvent);
  eventModal.closeModal();
}

async function confirmDelete() {
  await eventStore.deleteEvents(props.application.id, selectedEventIds.value);
  selectedEventIds.value = [];
  showDeleteConfirmation.value = false;
}

function removeSelectedEvents() {
  if (!selectedEventIds.value.length) {
    toaster.addErrorMessage("Aucune sélection.");
    return;
  }
  showDeleteConfirmation.value = true;
}

function cancelDelete() {
  showDeleteConfirmation.value = false;
}

function customSort(a: unknown, b: unknown) {
  const dict = headers.reduce((acc, header, index) => {
    acc[index] = header.key;
    return acc;
  }, {});

  return customSorter(a, b, currentSortedColumn.value, dict);
}
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
    <div class="fr-col">
      <h3 class="fr-mb-0">Gestion des événements</h3>
    </div>
    <div class="fr-col-auto">
      <DsfrButton
        type="button"
        class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-add-line"
        @click="eventModal.openCreateModal()"
        :disabled="!userPermissions?.includes('write')"
      >
        Ajouter un événement
      </DsfrButton>
    </div>
  </div>

  <div v-if="!loading && rows.length === 0" class="text-center">
    <p>Aucun événement enregistré.</p>
  </div>

  <div v-else>
    <div class="global-delete">
      <DsfrButton
        type="button"
        tertiary
        icon="fr-icon-delete-line"
        @click="removeSelectedEvents"
        :disabled="selectedEventIds.length === 0 || !userPermissions?.includes('write')"
      >
        Supprimer la sélection
      </DsfrButton>
    </div>

    <AppLoader v-if="loading" />

    <DsfrDataTable
      v-else
      v-model:selection="selectedEventIds"
      v-model:current-page="currentPage"
      :headers-row="headers"
      :rows="rows"
      row-key="id"
      title="Liste des événements associés"
      pagination
      :rows-per-page="5"
      :pagination-options="[5, 10, 20, 30]"
      bottom-action-bar-class="bottom-action-bar-class"
      pagination-wrapper-class="pagination-wrapper-class"
      sortable-rows
      :sortFn="customSort"
      v-model:sortedBy="currentSortedColumn"
    >
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

  <DsfrModal :opened="eventModal.isCreateModalOpen.value" title="Ajouter un événement" @close="eventModal.closeModal">
    <EventForm :application="application" :is-submitting="isSubmitting" @submit="handleCreateEvent" @cancel="eventModal.closeModal" />
  </DsfrModal>

  <DeleteConfirmationModal :opened="showDeleteConfirmation" item-name="événements" @confirm="confirmDelete" @cancel="cancelDelete" />
</template>

<style scoped>
input[type="checkbox"] {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 2px solid var(--dsfr-border, #ccc);
  transition: all 0.3s ease;
}
</style>
