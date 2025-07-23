// src/stores/complianceStore.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import CompliancesApi from "@/api/compliance";
import useToaster from "@/composables/use-toaster";
import type { Compliance } from "@/models/Application";

export const useComplianceStore = defineStore("complianceStore", () => {
  const compliance = ref<Compliance | null>(null);
  const isLoading = ref(false);
  const toaster = useToaster();

  // Fetch global compliance object
  const fetchCompliance = async (applicationId: string) => {
    try {
      isLoading.value = true;
      compliance.value = await CompliancesApi.getCompliance(applicationId);
      console.log("▶️ store.compliance =", compliance.value);
    } catch (error) {
      toaster.addErrorMessage("Erreur lors de la récupération des conformités.");
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  // Create or update: on crée un nouvel objet complet
  const createCompliance = async (applicationId: string, payload: Partial<Compliance>) => {
    try {
      console.log("Creating compliance with payload:", payload);
      const created = await CompliancesApi.createCompliance(applicationId, payload);
      console.log("Compliance created store:", created);
      compliance.value = created;
      toaster.addSuccessMessage("Conformité créée avec succès !");
      return created;
    } catch (error) {
      console.error("Error creating compliance:", error);
      toaster.addErrorMessage("Erreur lors de la création de la conformité.");
      throw error;
    }
  };

  const updateCompliance = async (applicationId: string, payload: Partial<Compliance>) => {
    try {
      const updated = await CompliancesApi.updateCompliance(applicationId, payload);
      compliance.value = updated;
      toaster.addSuccessMessage("Conformité mise à jour avec succès !");
      return updated;
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
