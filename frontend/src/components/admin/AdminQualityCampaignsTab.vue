<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { QualityCampaignDto } from "@/client/types.gen";
import { useQualityCampaignStore } from "@/stores/qualityCampaignStore";
import QualityCampaignActions from "./QualityCampaignActions.vue";
import RefAppTable from "@/components/RefAppTable.vue";
import type { TableColumn, TableSortEvent } from "@/types/table";

const store = useQualityCampaignStore();

const headers = [
  { key: "name", label: "Nom", sortable: true },
  { key: "sponsorEmails", label: "Sponsors", sortable: false },
  { key: "startDate", label: "Début", sortable: true },
  { key: "endDate", label: "Fin", sortable: true },
  { key: "status", label: "Statut", sortable: true },
  { key: "targetCount", label: "Apps ciblées", sortable: true },
  { key: "impact", label: "IQ moyen (début → actuel)", sortable: false },
  { key: "actions", label: "Actions", sortable: false },
] as const;

const tableColumns: TableColumn[] = headers.map((h) => ({
  field: h.key,
  header: h.label,
  sortable: h.sortable,
}));

const itemsPerPage = ref(15);
const currentPage = ref(0);
const firstIndex = computed(() => currentPage.value * itemsPerPage.value);

const sortColumn = ref<(typeof headers)[number]["key"]>();
const isSortDescending = ref(true);

const isSponsorsModalOpen = ref(false);
const viewingCampaign = ref<QualityCampaignDto | null>(null);

function formatDate(value?: Date | string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR");
}

function formatIq(value?: number | null) {
  return value != null ? Math.round(value).toString() : "—";
}

const STATUS_LABELS: Record<QualityCampaignDto["status"], string> = {
  scheduled: "Planifiée",
  in_progress: "En cours",
  done: "Terminée",
};

async function fetchCampaigns() {
  await store.fetchCampaigns(currentPage.value, itemsPerPage.value, sortColumn.value, isSortDescending.value ? "desc" : "asc");
}

const tableRows = computed(() =>
  store.campaigns.map((campaign) => ({
    name: campaign.name,
    sponsorEmails: campaign.sponsorEmails,
    startDate: formatDate(campaign.startDate),
    endDate: formatDate(campaign.endDate),
    status: STATUS_LABELS[campaign.status],
    targetCount: campaign.targetCount,
    impact: `${formatIq(campaign.averageIqAtStart)} → ${formatIq(campaign.averageIqCurrent)}`,
    actions: campaign,
  })),
);

function onSort(event: TableSortEvent) {
  sortColumn.value = event.sortField as (typeof headers)[number]["key"];
  isSortDescending.value = event.sortOrder === -1;
  currentPage.value = 0;
  fetchCampaigns();
}

function onPage(event: { page: number; rows: number }) {
  currentPage.value = event.page;
  itemsPerPage.value = event.rows;
  fetchCampaigns();
}

function openSponsorsModal(campaign: QualityCampaignDto) {
  viewingCampaign.value = campaign;
  isSponsorsModalOpen.value = true;
}

function closeSponsorsModal() {
  isSponsorsModalOpen.value = false;
}

onMounted(fetchCampaigns);
</script>

<template>
  <h1 class="fr-h1" data-testid="admin-quality-campaigns-title">Campagnes de mise en qualité</h1>

  <p class="fr-text--sm fr-hint-text fr-mb-3w" style="white-space: normal">
    Une campagne cible un sous-ensemble d'applications via un filtre et relance par email les acteurs (MOA/MOE) de ces applications pour les
    inciter à améliorer leur indice de qualité. Elle se crée depuis le catalogue, via le bouton « Créer une campagne qualité » une fois vos
    filtres appliqués. L'envoi se déclenche automatiquement à la date de début. Le rapport de résultats peut être envoyé au sponsor à tout
    moment.
  </p>

  <div v-if="store.isLoading" class="fr-alert fr-alert--info" data-testid="admin-quality-campaigns-loading">
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
      :total-records="store.total"
      :sort-field="sortColumn"
      :sort-order="isSortDescending ? -1 : 1"
      data-testid="admin-quality-campaigns-table"
      @sort="onSort"
      @page="onPage"
    >
      <template #body-sponsorEmails="{ data: row }">
        <DsfrButton
          v-if="row.sponsorEmails.length > 0"
          :label="`Voir (${row.sponsorEmails.length})`"
          size="sm"
          tertiary
          :data-testid="`admin-quality-campaign-view-sponsors-${row.actions.id}`"
          :title="`Voir les sponsors de la campagne ${row.name}`"
          :aria-label="`Voir les ${row.sponsorEmails.length} sponsor(s) de la campagne ${row.name}`"
          @click="openSponsorsModal(row.actions)"
        />
        <span v-else>—</span>
      </template>

      <template #body-actions="{ data: row }">
        <QualityCampaignActions :campaign="row.actions" @fetch-campaigns="fetchCampaigns" />
      </template>
    </RefAppTable>
  </div>

  <DsfrModal
    :opened="isSponsorsModalOpen"
    :title="`Sponsors de la campagne « ${viewingCampaign?.name} »`"
    data-testid="admin-quality-campaign-sponsors-modal"
    @close="closeSponsorsModal"
  >
    <ul v-if="viewingCampaign" data-testid="admin-quality-campaign-sponsors-list">
      <li v-for="sponsorEmail in viewingCampaign.sponsorEmails" :key="sponsorEmail">{{ sponsorEmail }}</li>
    </ul>

    <template #footer>
      <DsfrButtonGroup :inline-layout-when="true" :reverse="true">
        <DsfrButton label="Fermer" secondary data-testid="admin-quality-campaign-sponsors-close-btn" @click="closeSponsorsModal" />
      </DsfrButtonGroup>
    </template>
  </DsfrModal>
</template>
