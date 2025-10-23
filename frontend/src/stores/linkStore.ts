import type { CreateLinkDto, LinkDto, UpdateLinkDto } from "@/client/types.gen.js";
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index.js";
import { useToasterStore } from "@/stores/toasterStore";

interface LinkFilters {
  page?: number
  pageSize?: number
  sortBy?: string
  order?: "asc" | "desc"
}

export const useLinkStore = defineStore("linkStore", () => {
  const links = ref<LinkDto[]>([]);
  const total = ref(0);
  const isLoading = ref(false);
  const toaster = useToasterStore();

  const fetchLinks = async (applicationId: string, filters: LinkFilters = {}) => {
    try {
      isLoading.value = true;

      // Remove undefined values
      const cleanParams = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined),
      );

      const response = await api.applicationLinksControllerFindAll({
        path: { applicationId },
        query: cleanParams as any,
      });

      if (!response.response.ok) {
        throw new Error("Erreur lors de la récupération des liens.");
      }

      // Handle paginated response
      const responseData = response.data as any;
      links.value = responseData.results ?? [];
      total.value = responseData.total ?? 0;
    } catch (error) {
      toaster.addErrorMessage("Erreur lors de la récupération des liens.");
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  const createLink = async (applicationId: string, link: Omit<CreateLinkDto, "id">) => {
    try {
      const response = await api.applicationLinksControllerCreate({ path: { applicationId }, body: link });
      if (!response.response.ok || !response.data) {
        throw new Error("Erreur lors de la création du lien.");
      }
      toaster.addSuccessMessage("Lien créé avec succès !");
      return response.data;
    } catch (error) {
      toaster.addErrorMessage("Erreur lors de la création du lien.");
      throw error;
    }
  };

  const updateLink = async (applicationId: string, link: UpdateLinkDto & { id: string }) => {
    try {
      const updateDto = {
        link: link.link,
        type: link.type,
        description: link.description,
      };
      const response = await api.applicationLinksControllerUpdate({
        path: { applicationId, id: link.id },
        body: updateDto,
      });
      if (!response.response.ok || !response.data) {
        throw new Error("Erreur lors de la modification du lien.");
      }
      toaster.addSuccessMessage("Lien modifié avec succès !");
      return response.data;
    } catch (error) {
      toaster.addErrorMessage("Erreur lors de la modification du lien.");
      throw error;
    }
  };

  const deleteLinks = async (applicationId: string, linkIds: string[]) => {
    try {
      if (linkIds.length === 0) {
        toaster.addErrorMessage("Aucun lien sélectionné pour la suppression.");
        return;
      }

      await Promise.all(linkIds.map(linkId =>
        api.applicationLinksControllerDelete({ path: { applicationId, id: linkId } }),
      ));
      toaster.addSuccessMessage("Liens supprimés avec succès !");
    } catch (error) {
      toaster.addErrorMessage("Erreur lors de la suppression des liens.");
      throw error;
    }
  };

  return {
    links,
    total,
    isLoading,
    fetchLinks,
    createLink,
    updateLink,
    deleteLinks,
  };
});
