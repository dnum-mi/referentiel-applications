import type { ComplianceDto, CreateComplianceDto, UpdateComplianceDto } from "@/client/types.gen";
// src/stores/complianceStore.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index.js";
import { useToasterStore } from "@/stores/toasterStore";

export const useComplianceStore = defineStore("complianceStore", () => {
  const compliance = ref<ComplianceDto | null>(null);
  const isLoading = ref(false);
  const toaster = useToasterStore();

  // Fetch global compliance object
  const fetchCompliance = async (applicationId: string) => {
    try {
      isLoading.value = true;
      const response = await api.applicationCompliancesControllerFindOne({ path: { applicationId } });
      compliance.value = response.data ?? null;
      return compliance.value;
    } catch (error) {
      toaster.addErrorMessage("Erreur lors de la récupération des conformités.");
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  // Create or update: on crée un nouvel objet complet
  const createCompliance = async (applicationId: string, payload: Partial<CreateComplianceDto>) => {
    try {
      const response = await api.applicationCompliancesControllerCreate({ path: { applicationId }, body: payload });
      if (!response.response.ok || !response.data) {
        throw new Error("Erreur lors de la création de la conformité.");
      }
      compliance.value = response.data;
      toaster.addSuccessMessage("Conformité créée avec succès !");
      return response.data;
    } catch (error) {
      console.error("Error creating compliance:", error);
      toaster.addErrorMessage("Erreur lors de la création de la conformité.");
      throw error;
    }
  };

  const updateCompliance = async (applicationId: string, payload: Partial<UpdateComplianceDto>) => {
    try {
      const response = await api.applicationCompliancesControllerUpdate({ path: { applicationId }, body: payload });
      if (!response.response.ok || !response.data) {
        throw new Error("Erreur lors de la mise à jour de la conformité.");
      }
      compliance.value = response.data;
      toaster.addSuccessMessage("Conformité mise à jour avec succès !");
      return response.data;
    } catch (error) {
      toaster.addErrorMessage("Erreur lors de la modification de la conformité.");
      throw error;
    }
  };

  return {
    compliance,
    isLoading,
    fetchCompliance,
    createCompliance,
    updateCompliance,
  };
});
