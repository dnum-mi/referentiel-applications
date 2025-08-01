import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index";
import type { OrganizationDto } from "@/client/types.gen";

export const useOrganizationStore = defineStore("organizationStore", () => {
  const organizations = ref<Record<string, OrganizationDto>>({});
  const error = ref<string | null>(null);

  /**
   * Search for organizations by label or sigle.
   * @param search - The search term to filter organizations.
   * @returns A promise that resolves to an array of organizations matching the search term.
   */
  async function search(search: string): Promise<OrganizationDto[]> {
    const response = await api.organizationControllerFindAll({
      query: { search },
    });
    if (!response.response.ok) {
      throw new Error("Failed to fetch organizations");
    }
    if (!response.data) {
      organizations.value = {};
      return [];
    }
    response.data.forEach((org: OrganizationDto) => {
      organizations.value[org.id] = org;
    });
    error.value = null;
    return Object.values(response.data);
  }
  /**
   * Get an organization by its ID.
   * If the organization is not found, it will fetch it.
   * Prefer to use a computed on `organizations` to get the incoming organization.
   * @param id - The ID of the organization to retrieve.
   * @returns The organization object or undefined if not found.
   */
  function getById(id: string): OrganizationDto | undefined {
    const org = organizations.value[id];
    if (!org) {
      fetchById(id);
    }
    return org;
  }

  /**
   * Fetch an organization by its ID and store it and its ancestors in the store.
   * Prefer to use `getById` to retrieve an organization using cached data.
   * If the organization is not found, it will create a fake one.
   * @param id - The ID of the organization to fetch.
   * @returns The fetched organization or a fake one if not found.
   */
  async function fetchById(id: string): Promise<OrganizationDto> {
    const response = await api.organizationControllerFindOne({
      path: { id },
    });
    if (response.response.ok && response.data) {
      organizations.value[id] = response.data;
      return response.data;
    }
    // If the organization is not found, we create a fake one
    error.value = response.response.statusText || "Organisation non trouvée";
    await api.organizationControllerFindAll({
      query: { ids: id },
    })
      .then((response) => {
        if (response.response.ok && response.data) {
          response.data.forEach((org: OrganizationDto) => {
            organizations.value[org.id] = org;
          });
        }
        error.value = null;
      })
      .catch((err) => {
        console.error(`❌ Erreur lors de la récupération de l'organisation avec l'id ${id}`, err);
        error.value = err.message ?? "Erreur inconnue";
        const fakeData: OrganizationDto = {
          id,
          label: "Organisation non trouvée",
          url: "", // Set to undefined if not found
          sigle: "NOT FOUND", // Set to undefined if not found
          parentId: null, // Set to null if not found
        };
        organizations.value = { ...organizations.value, [id]: fakeData };
      });
    return organizations.value[id];
  }

  return {
    organizations,
    error,
    fetchById,
    getById,
    search,
  };
});
