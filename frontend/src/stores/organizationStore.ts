import { defineStore } from "pinia";
import { ref } from "vue";
import type { Organization } from "@/models/organization";
import { call } from "@/api/callService";

export const useOrganizationStore = defineStore("organizationStore", () => {
  const organizations = ref<Organization[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function fetchAll() {
    try {
      isLoading.value = true;
      const result = await call("organization", "list");
      organizations.value = result;
    } catch (err: any) {
      console.error("❌ Erreur lors du chargement des organisations :", err);
      error.value = err.message ?? "Erreur inconnue";
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchById(id: string): Promise<Organization | undefined> {
    try {
      return await call("organization", "get", { id });
    } catch (err) {
      console.error(`❌ Erreur lors de la récupération de l'organisation avec l'id ${id}`, err);
      return undefined;
    }
  }

  return {
    organizations,
    isLoading,
    error,
    fetchAll,
    fetchById,
  };
});
