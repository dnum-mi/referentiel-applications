import { isApiSuccess } from "@/api/api-result";
import type { OrganizationDto } from "@/client/types.gen";
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index";
import { useDebounceFn } from "@vueuse/core";

export const useOrganizationStore = defineStore("organizationStore", () => {
  const organizations = ref<Record<string, OrganizationDto>>({});
  const error = ref<string | null>(null);

  const pendingIds: Set<string> = new Set();
  const resolvers = new Map<string, ((org: OrganizationDto | undefined) => void)[]>();

  function storeOrganization(orgs: OrganizationDto[]) {
    orgs.forEach((org) => {
      organizations.value[org.id] = org;
    });
  }

  async function find(search?: string, usedOnly?: boolean): Promise<OrganizationDto[]> {
    const response = await api.organizationsControllerFindAll({
      // pageSize 0 : pas de pagination, sinon l'API coupe à 50 résultats.
      query: { search, usedOnly, pageSize: 0 },
    });
    if (!isApiSuccess(response)) {
      throw new Error("Failed to fetch organizations");
    }
    if (!response.data?.results) {
      return [];
    }
    const organizations = response.data.results;
    storeOrganization(organizations);
    error.value = null;
    return organizations;
  }

  // Debounced batch fetch
  const debouncedFetch = useDebounceFn(async () => {
    const ids = Array.from(pendingIds);
    pendingIds.clear();
    const results = new Map<string, OrganizationDto>();

    try {
      const response = await api.organizationsControllerFindAll({
        query: { ids, pageSize: 0 },
      });

      if (!isApiSuccess(response)) {
        throw new Error("Erreur lors de la récupération des organisations");
      }
      const organizations = response.data?.results ?? [];
      storeOrganization(organizations);
      organizations.forEach((org) => results.set(org.id, org));
      error.value = null;
    } catch (err) {
      console.error("❌ Erreur lors de la récupération des organisations", err);
      error.value = err instanceof Error ? err.message : "Erreur inconnue";
    } finally {
      // Chaque identifiant demandé doit se terminer, même absent ou en erreur.
      // Ne traiter que ce batch : un autre peut déjà être en vol.
      for (const id of ids) {
        const subscribers = resolvers.get(id);
        resolvers.delete(id);
        subscribers?.forEach((resolve) => resolve(results.get(id)));
      }
    }
  }, 10);

  /**
   * Get an organization by its ID.
   * Always returns a promise — no more sync/async split.
   * Missing organizations and failed requests resolve to undefined; errors are exposed in `error`.
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
      const subscribers = resolvers.get(id);
      if (subscribers) {
        subscribers.push(resolve);
        return;
      }
      resolvers.set(id, [resolve]);
      pendingIds.add(id);
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
