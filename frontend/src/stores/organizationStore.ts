import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index";
import type { OrganizationDto } from "@/client/types.gen";
import { debounce } from "@/utils/debouncer-utils";

export const useOrganizationStore = defineStore("organizationStore", () => {
  const organizations = ref<Record<string, OrganizationDto>>({});
  const error = ref<string | null>(null);

  const pendingIds: Set<string> = new Set();
  const resolvers: Record<string, (org: OrganizationDto | undefined) => void> = {};

  function storeOrganization(orgs: OrganizationDto[]) {
    orgs.forEach((org) => {
      organizations.value[org.id] = org;
    });
  }

  async function find(search?: string, usedOnly?: boolean): Promise<OrganizationDto[]> {
    const response = await api.organizationControllerFindAll({
      query: { search, usedOnly },
    });
    if (!response.response.ok) {
      throw new Error("Failed to fetch organizations");
    }
    if (!response.data) {
      return [];
    }
    storeOrganization(response.data);
    error.value = null;
    return response.data;
  }

  // Debounced batch fetch
  const debouncedFetch = debounce(async () => {
    const ids = Array.from(pendingIds);
    pendingIds.clear();

    try {
      const response = await api.organizationControllerFindAll({
        query: { ids: ids.join(","), withAncestors: true },
      });

      if (response.response.ok && response.data) {
        storeOrganization(response.data);

        response.data.forEach((org: OrganizationDto) => {
          resolvers[org.id]?.(org);
          delete resolvers[org.id];
        });
      }
    } catch (err: any) {
      console.error("❌ Erreur lors de la récupération des organisations", err);
      error.value = err.message ?? "Erreur inconnue";
    }
  }, 10);

  /**
   * Get an organization by its ID.
   * Always returns a promise — no more sync/async split.
   */
  async function getById(id: string): Promise<OrganizationDto | undefined> {
    if (organizations.value[id]) {
      return organizations.value[id];
    }
    return fetchById(id);
  }

  async function fetchById(id: string): Promise<OrganizationDto | undefined> {
    return new Promise((resolve) => {
      if (organizations.value[id]) {
        resolve(organizations.value[id]);
        return;
      }
      pendingIds.add(id);
      resolvers[id] = resolve;
      debouncedFetch();
    });
  }

  return {
    organizations,
    error,
    fetchById,
    getById,
    find,
  };
});
