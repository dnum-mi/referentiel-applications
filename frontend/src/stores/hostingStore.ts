import { defineStore } from "pinia";
import { ref } from "vue";
import type { Hosting } from "@/models/Hosting";
import useToaster from "@/composables/use-toaster";
import Hostings from "@/api/hosting";

export const useHostingStore = defineStore("hostingStore", () => {
  const hostings = ref<Hosting[]>([]);
  const isLoading = ref(false);
  const toaster = useToaster();

  const fetchHostings = async (applicationId: string) => {
    try {
      isLoading.value = true;
      hostings.value = await Hostings.getHostingsByApplicationId(applicationId);
    } catch (error) {
      console.error("Error fetching hostings:", error);
      toaster.addErrorMessage("Erreur lors de la récupération des hébergements");
    } finally {
      isLoading.value = false;
    }
  };

  const createHosting = async (applicationId: string, hosting: Hosting) => {
    try {
      await Hostings.create(hosting, applicationId);
      await fetchHostings(applicationId);
      toaster.addSuccessMessage("Hébergement créé avec succès");
    } catch (error) {
      console.error("Error creating hosting:", error);
      toaster.addErrorMessage("Erreur lors de la création de l'hébergement");
      throw error;
    }
  };

  const updateHosting = async (applicationId: string, hosting: Hosting) => {
    try {
      await Hostings.update(hosting.id, hosting, applicationId);
      await fetchHostings(applicationId);
      toaster.addSuccessMessage("Hébergement mis à jour avec succès");
    } catch (error) {
      console.error("Error updating hosting:", error);
      toaster.addErrorMessage("Erreur lors de la mise à jour de l'hébergement");
      throw error;
    }
  };

  const deleteHosting = async (applicationId: string, hostingId: string) => {
    try {
      await Hostings.delete(hostingId, applicationId);
      hostings.value = hostings.value.filter((h) => h.id !== hostingId);
      toaster.addSuccessMessage("Hébergement supprimé avec succès");
    } catch (error) {
      console.error("Error deleting hosting:", error);
      toaster.addErrorMessage("Erreur lors de la suppression de l'hébergement");
      throw error;
    }
  };

  return {
    hostings,
    isLoading,
    fetchHostings,
    createHosting,
    updateHosting,
    deleteHosting,
  };
});
