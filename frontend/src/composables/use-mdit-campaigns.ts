import { computed, ref } from "vue";
import api from "@/api";
import type { MditCampaignDto } from "@/client/types.gen";

// État partagé (singleton) des campagnes dette IT actives, présentées dans le
// sélecteur de campagne du diagramme Time. Triées du millésime le plus récent
// au plus ancien (ordre fourni par l'API).
const campaigns = ref<MditCampaignDto[]>([]);
let loaded = false;

export function useMditCampaigns() {
  async function loadActiveCampaigns(force = false): Promise<MditCampaignDto[]> {
    if (loaded && !force) return campaigns.value;
    const response = await api.mditCampaignControllerFindAll({
      query: { onlyActive: true, page: 0, pageSize: 100 },
      throwOnError: true,
    });
    campaigns.value = response.data?.results ?? [];
    loaded = true;
    return campaigns.value;
  }

  /** Millésime de la campagne la plus récente (présentée par défaut). */
  const latestYear = computed<number | undefined>(() => campaigns.value[0]?.year);

  return { campaigns, loadActiveCampaigns, latestYear };
}
