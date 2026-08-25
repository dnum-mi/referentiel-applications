import type { CreateQualityCampaignDto, QualityCampaignDto } from "@/client/types.gen";
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index";
import { useToasterStore } from "@/stores/toasterStore";

export const useQualityCampaignStore = defineStore("qualityCampaignStore", () => {
  const campaigns = ref<QualityCampaignDto[]>([]);
  const total = ref(0);
  const isLoading = ref(false);

  async function fetchCampaigns(page = 0, pageSize = 15, sortBy?: string, order?: "asc" | "desc") {
    isLoading.value = true;
    try {
      const response = await api.qualityCampaignControllerFindAll({ query: { page, pageSize, sortBy, order } });
      if (response.data) {
        campaigns.value = response.data.results;
        total.value = response.data.total;
      }
    } finally {
      isLoading.value = false;
    }
  }

  async function createCampaign(body: CreateQualityCampaignDto) {
    const toaster = useToasterStore();
    try {
      const response = await api.qualityCampaignControllerCreate({ body });
      if (!response.response.ok || !response.data) {
        throw new Error("Erreur lors de la création de la campagne");
      }
      toaster.addSuccessMessage(`Campagne « ${response.data.name} » créée.`);
      return response.data;
    } catch {
      toaster.addErrorMessage("Erreur lors de la création de la campagne.");
      return undefined;
    }
  }

  async function updateCampaign(id: string, body: Partial<CreateQualityCampaignDto>) {
    const toaster = useToasterStore();
    try {
      const response = await api.qualityCampaignControllerUpdate({ path: { id }, body });
      if (!response.response.ok || !response.data) {
        throw new Error("Erreur lors de la mise à jour de la campagne");
      }
      toaster.addSuccessMessage("Campagne mise à jour.");
      return response.data;
    } catch {
      toaster.addErrorMessage("Erreur lors de la mise à jour de la campagne.");
      return undefined;
    }
  }

  async function deleteCampaign(id: string) {
    const toaster = useToasterStore();
    try {
      const response = await api.qualityCampaignControllerRemove({ path: { id } });
      if (!response.response.ok) {
        throw new Error("Erreur lors de la suppression de la campagne");
      }
      campaigns.value = campaigns.value.filter((c) => c.id !== id);
    } catch {
      toaster.addErrorMessage("Erreur lors de la suppression de la campagne.");
    }
  }

  async function sendCampaign(id: string) {
    const toaster = useToasterStore();
    try {
      const response = await api.qualityCampaignControllerSend({ path: { id } });
      if (!response.response.ok || !response.data) {
        throw new Error("Erreur lors de l'envoi de la campagne");
      }
      toaster.addSuccessMessage("Campagne envoyée aux acteurs des applications ciblées.");
      return response.data;
    } catch {
      toaster.addErrorMessage("Erreur lors de l'envoi de la campagne.");
      return undefined;
    }
  }

  async function sendSponsorReport(id: string) {
    const toaster = useToasterStore();
    try {
      const response = await api.qualityCampaignControllerSendSponsorReport({ path: { id } });
      if (!response.response.ok || !response.data) {
        throw new Error("Erreur lors de l'envoi du rapport au sponsor");
      }
      toaster.addSuccessMessage("Rapport de résultats envoyé au sponsor.");
      return response.data;
    } catch {
      toaster.addErrorMessage("Erreur lors de l'envoi du rapport au sponsor.");
      return undefined;
    }
  }

  async function previewCampaign(id: string) {
    const toaster = useToasterStore();
    try {
      const response = await api.qualityCampaignControllerPreview({ path: { id } });
      if (!response.response.ok || !response.data) {
        throw new Error("Erreur lors de l'aperçu de la campagne");
      }
      return response.data;
    } catch {
      toaster.addErrorMessage("Erreur lors de l'aperçu de la campagne.");
      return undefined;
    }
  }

  return {
    campaigns,
    total,
    isLoading,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    sendCampaign,
    sendSponsorReport,
    previewCampaign,
  };
});
