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

const events = ref([]);
const event = ref({
  start: undefined as string | undefined,
  end: undefined as string | undefined,
  type: "under_construction",
  description: "",
  applicationId: props.application.id,
});

async function createEvent() {
  try {
    event.value.start = event.value.start ? new Date(event.value.start).toISOString() : undefined;
    event.value.end = event.value.end ? new Date(event.value.end).toISOString() : undefined;
    const response = await axios.post(`applications/${props.application.id}/events`, event.value);
    toaster.addSuccessMessage("Événement créé avec succès !");
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

async function deleteEvent(eventId: number) {
  try {
    console.log(eventId);
    await axios.delete(`applications/${props.application.id}/events/${eventId}`);
    toaster.addSuccessMessage("Événement supprimé avec succès !");
    fetchEvents();
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la suppression de l'événement.");
  }
}

onMounted(fetchEvents);

const loading = ref(false);

const headers = [
  { key: "start", label: "Début" },
  { key: "end", label: "Fin" },
  { key: "type", label: "Type" },
  { key: "description", label: "Description" },
  { key: "actions", label: "Actions" },
];

const rows = computed(() => {
  return events.value.map((event) => [event.start || "", event.end || "", event.type, event.description || "", event.id]);
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

console.log(rows.value);
</script>

<template>
  <DsfrDataTable title="Évenements" :headers-row="headers" :rows="rows" sortable-rows :row-key="4">
    <template #header="{ key, label }">
      <div @click="click($event, key)">
        {{ label }}
      </div>
    </template>

    <template #cell="{ colKey, cell, row }">
      <template v-if="colKey === 'actions'">
        <DsfrButton type="button" @click="deleteEvent(cell)"> Supprimer </DsfrButton>
      </template>
      <template v-else-if="colKey === 'type'">
        {{ eventTypes.find((type) => type.value === cell)?.text || cell }}
      </template>
      <template v-else>
        {{ cell }}
      </template>
    </template>
  </DsfrDataTable>
  <h4 class="fr-mt-4w">Ajouter un événement</h4>
  <DsfrInput v-model="event.start" label="Date de début" label-visible type="date" class="fr-mb-1w" />
  <DsfrInput v-model="event.end" label="Date de fin" label-visible type="date" class="fr-mb-1w" />
  <DsfrInput v-model="event.description" label="Description" label-visible class="fr-mb-1w" />
  <DsfrSelect v-model="event.type" :options="eventTypes" label="Type d'événement" label-visible class="fr-mb-1w" />
  <DsfrButton type="button" @click="createEvent"> Ajouter </DsfrButton>
</template>
