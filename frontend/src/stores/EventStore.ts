import { defineStore } from "pinia";
import { ref } from "vue";
import { call } from "@/api/callService";
import type { Event } from "@/models/Application";
import useToaster from "@/composables/use-toaster";

export const useEventStore = defineStore("eventStore", () => {
  const events = ref<Event[]>([]);
  const isLoading = ref(false);
  const toaster = useToaster();

  const fetchEvents = async (applicationId: string) => {
    try {
      isLoading.value = true;
      const res = await call("event", "getByApplication", { applicationId });
      events.value = res || [];
    } catch {
      toaster.addErrorMessage("Erreur lors du chargement des événements.");
    } finally {
      isLoading.value = false;
    }
  };

  const createEvent = async (applicationId: string, event: Partial<Event>) => {
    try {
      const payload = {
        ...event,
        applicationId,
        start: event.start ? new Date(event.start).toISOString() : undefined,
        end: event.end ? new Date(event.end).toISOString() : undefined,
      };
      await call("event", "create", payload);
      toaster.addSuccessMessage("Événement créé avec succès !");
      await fetchEvents(applicationId);
    } catch {
      toaster.addErrorMessage("Erreur lors de la création de l'événement.");
    }
  };

  const deleteEvents = async (applicationId: string, ids: string[]) => {
    try {
      await Promise.all(ids.map(id => call("event", "delete", { applicationId, eventId: id })));
      toaster.addSuccessMessage("Événements supprimés avec succès !");
      await fetchEvents(applicationId);
    } catch {
      toaster.addErrorMessage("Erreur lors de la suppression des événements.");
    }
  };

  return {
    events,
    isLoading,
    fetchEvents,
    createEvent,
    deleteEvents,
  };
});
