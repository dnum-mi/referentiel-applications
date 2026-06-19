<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { MditCampaignDto } from "@/client/types.gen";
import MditCampaignActions from "./MditCampaignActions.vue";
import api from "@/api";
import RefAppTable from "@/components/RefAppTable.vue";
import type { TableColumn } from "@/types/table";

const data = ref<{ results: MditCampaignDto[]; total: number }>({ results: [], total: 0 });

const headers = [
  { key: "year", label: "Millésime" },
  { key: "label", label: "Libellé" },
  { key: "isActive", label: "Active" },
  { key: "actions", label: "Actions" },
] as const;

const tableColumns: TableColumn[] = headers.map((h) => ({
  field: h.key,
  header: h.label,
  sortable: false,
}));

const isLoading = ref(false);
const itemsPerPage = ref(15);
const currentPage = ref(0);
const firstIndex = computed(() => currentPage.value * itemsPerPage.value);

async function fetchCampaigns() {
  isLoading.value = true;
  const response = await api.mditCampaignControllerFindAll({
    query: { page: currentPage.value, pageSize: itemsPerPage.value },
  });
  if (response.data?.results) {
    data.value = response.data;
  }
  isLoading.value = false;
}

const tableRows = computed(() =>
  data.value.results.map((campaign) => ({
    year: campaign.year,
    label: campaign.label ?? "—",
    isActive: campaign.isActive ? "Oui" : "Non",
    actions: campaign,
  })),
);

function onPage(event: { page: number; rows: number }) {
  currentPage.value = event.page;
  itemsPerPage.value = event.rows;
  fetchCampaigns();
}

onMounted(fetchCampaigns);
</script>

<template>
  <div class="header-row">
    <h1 class="fr-h1" data-testid="admin-campaigns-title">Gestion des campagnes dette IT</h1>

    <MditCampaignActions @fetch-campaigns="fetchCampaigns" />
  </div>

  <div v-if="isLoading" class="fr-alert fr-alert--info" data-testid="admin-campaigns-loading">
    <p>Chargement des campagnes...</p>
  </div>

  <div v-else>
    <RefAppTable
      :items="tableRows"
      :columns="tableColumns"
      :paginator="true"
      :lazy="true"
      :rows="itemsPerPage"
      :first="firstIndex"
      :total-records="data.total"
      data-testid="admin-campaigns-table"
      @page="onPage"
    >
      <template #body-actions="{ data: row }">
        <MditCampaignActions :campaign="row.actions" @fetch-campaigns="fetchCampaigns" />
      </template>
    </RefAppTable>
  </div>
</template>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
