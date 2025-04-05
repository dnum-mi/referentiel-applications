import { defineStore } from "pinia";
import { ref } from "vue";
import { call } from "@/api/callService";
import useToaster from "@/composables/use-toaster";
import type { ExternalRessource } from "@/models/Application";

export const useLinkStore = defineStore("linkStore", () => {
  const links = ref<ExternalRessource[]>([]);
  const isLoading = ref(false);
  const toaster = useToaster();

  const fetchLinks = async (applicationId: string) => {
    try {
      isLoading.value = true;
      const result = await call("link", "getByApplication", { applicationId });
      links.value = result || [];
    } catch (error) {
      toaster.addErrorMessage("Erreur lors de la récupération des liens.");
    } finally {
      isLoading.value = false;
    }
  };

  const createLink = async (applicationId: string, link: Omit<ExternalRessource, "id">) => {
    try {
      const newLink = await call("link", "create", {
        ...link,
        applicationId,
      });
      links.value.push(newLink);
      toaster.addSuccessMessage("Lien créé avec succès !");
      return newLink;
    } catch (error) {
      toaster.addErrorMessage("Erreur lors de la création du lien.");
      throw error;
    }
  };

  const updateLink = async (applicationId: string, link: ExternalRessource) => {
    try {
      const updated = await call("link", "update", {
        ...link,
        applicationId,
        linkId: link.id,
      });
      const index = links.value.findIndex((l) => l.id === link.id);
      if (index !== -1) links.value[index] = updated;
      toaster.addSuccessMessage("Lien modifié avec succès !");
      return updated;
    } catch (error) {
      toaster.addErrorMessage("Erreur lors de la modification du lien.");
      throw error;
    }
  };

  const deleteLinks = async (applicationId: string, linkIds: string[]) => {
    try {
      await Promise.all(linkIds.map((linkId) => call("link", "delete", { applicationId, linkId })));
      links.value = links.value.filter((l) => !linkIds.includes(l.id));
      toaster.addSuccessMessage("Liens supprimés avec succès !");
    } catch (error) {
      toaster.addErrorMessage("Erreur lors de la suppression des liens.");
      throw error;
    }
  };

  return {
    links,
    isLoading,
    fetchLinks,
    createLink,
    updateLink,
    deleteLinks,
  };
});
