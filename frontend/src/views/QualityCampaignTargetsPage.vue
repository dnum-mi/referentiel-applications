<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "@/api";
import { isApiSuccess } from "@/api/api-result";
import type { QualityCampaignDto, QualityCampaignTargetDto } from "@/client/types.gen";
import RefAppTable from "@/components/RefAppTable.vue";
import QualityCampaignTargetDetails from "@/components/admin/QualityCampaignTargetDetails.vue";
import { routeNames } from "@/router/route-names";
import type { TableColumn, TableSortEvent } from "@/types/table";

const route = useRoute();
const router = useRouter();
const campaign = ref<QualityCampaignDto>();
const campaignError = ref(false);
let campaignRequestId = 0;
async function fetchCampaign() {
  const currentRequest = ++campaignRequestId;
  campaign.value = undefined;
  campaignError.value = false;
  try {
    const result = await api.qualityCampaignControllerFindOne({ path: { id: String(route.params.id) } });
    if (currentRequest !== campaignRequestId) return;
    if (!isApiSuccess(result) || !result.data) {
      campaignError.value = true;
      return;
    }
    campaign.value = result.data;
  } catch {
    if (currentRequest === campaignRequestId) campaignError.value = true;
  }
}
const sentDate = computed(() => (campaign.value?.sentAt ? new Date(campaign.value.sentAt).toLocaleDateString("fr-FR") : undefined));
function refresh() {
  fetchCampaign();
  fetchTargets();
}
const targets = ref<QualityCampaignTargetDto[]>([]);
const total = ref(0);
const loading = ref(false);
const error = ref("");
let requestId = 0;
function integer(value: unknown, fallback: number, min: number, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  return typeof value === "string" && Number.isSafeInteger(number) && number >= min && number <= max ? number : fallback;
}
const page = computed(() => integer(route.query.page, 0, 0));
const pageSize = computed(() => integer(route.query.pageSize, 15, 1, 100));
const sortBy = computed(() => {
  const value = route.query.sortBy;
  return value === "label" || value === "iqAtStart" || value === "iqCurrent" ? value : "delta";
});
const order = computed(() => (route.query.order === "desc" ? "desc" : "asc"));
const progression = computed(() => {
  const value = route.query.progression;
  return value === "positive" || value === "stable_or_declining" || value === "not_comparable" ? value : undefined;
});
const columns: TableColumn[] = [
  { field: "label", header: "Application", sortable: true },
  { field: "iqAtStart", header: "IQ initial", sortable: true },
  { field: "iqCurrent", header: "IQ courant", sortable: true },
  { field: "delta", header: "Progression", sortable: true },
  { field: "details", header: "Critères et interlocuteurs" },
];
async function fetchTargets() {
  const currentRequest = ++requestId;
  loading.value = true;
  error.value = "";
  // Évite d'afficher les données de la campagne précédente pendant la navigation.
  targets.value = [];
  total.value = 0;
  try {
    const result = await api.qualityCampaignControllerFindTargets({
      path: { id: String(route.params.id) },
      query: { page: page.value, pageSize: pageSize.value, progression: progression.value, sortBy: sortBy.value, order: order.value },
    });
    if (currentRequest !== requestId) return;
    if (!isApiSuccess(result) || !result.data) {
      error.value =
        result.response?.status === 403
          ? "Vous n’avez pas accès à cette campagne."
          : result.response?.status === 404
            ? "Campagne introuvable."
            : result.response?.status === 400
              ? "Les cibles ne sont figées qu’à l’envoi de la campagne."
              : "Impossible de charger les cibles.";
      return;
    }
    targets.value = result.data.results;
    total.value = result.data.total;
  } catch {
    if (currentRequest === requestId) error.value = "Impossible de charger les cibles.";
  } finally {
    if (currentRequest === requestId) loading.value = false;
  }
}
function updateQuery(values: Record<string, string | undefined>) {
  return router.replace({ query: { ...route.query, ...values } });
}
function onFilter(event: Event) {
  updateQuery({ progression: (event.target as HTMLSelectElement).value || undefined, page: "0" });
}
function onSort(event: TableSortEvent) {
  updateQuery({ sortBy: event.sortField, order: event.sortOrder === -1 ? "desc" : "asc", page: "0" });
}
function onPage(event: { page: number; rows: number }) {
  updateQuery({ page: String(event.page), pageSize: String(event.rows) });
}
watch(() => route.params.id, fetchCampaign, { immediate: true });
watch(() => [route.params.id, page.value, pageSize.value, sortBy.value, order.value, progression.value], fetchTargets, { immediate: true });
</script>

<template>
  <div class="fr-container fr-py-3w">
    <RouterLink
      :to="{ name: routeNames.ADMINPAGE, query: { tab: 'tab-quality-campaigns' } }"
      class="fr-link fr-icon-arrow-left-line fr-link--icon-left"
    >
      Retour aux campagnes qualité
    </RouterLink>
    <p class="fr-text--sm fr-mt-3w fr-mb-1w">Suivi de campagne qualité</p>
    <h1 class="fr-mb-2w">{{ campaign?.name ?? "Cibles de la campagne qualité" }}</h1>
    <p v-if="campaignError" class="fr-text--sm">
      Le nom et la date de la campagne n’ont pas pu être chargés. Utilisez « Actualiser » pour réessayer.
    </p>
    <p class="fr-text--sm fr-mb-1w">
      Cibles figées à l’envoi<span v-if="sentDate"> le {{ sentDate }}</span
      >. Les IQ courants et les critères sont actualisés à chaque consultation.
    </p>
    <p class="fr-text--sm fr-hint-text">
      Seules les fiches que vous pouvez consulter sont affichées. La progression est exprimée en points d’IQ ; elle n’est pas comparable
      lorsqu’un des deux scores est inconnu.
    </p>
    <div class="campaign-toolbar fr-mb-3w">
      <div class="fr-select-group fr-mb-0">
        <label class="fr-label" for="campaign-progression">Progression</label>
        <select id="campaign-progression" class="fr-select" :value="progression ?? ''" @change="onFilter">
          <option value="">Toutes les progressions</option>
          <option value="positive">Progression positive</option>
          <option value="stable_or_declining">Stable ou en baisse</option>
          <option value="not_comparable">IQ non comparable</option>
        </select>
      </div>
      <DsfrButton
        label="Toutes les progressions"
        secondary
        :disabled="!progression || loading"
        @click="updateQuery({ progression: undefined, page: '0' })"
      />
      <DsfrButton label="Actualiser" secondary icon="fr-icon-refresh-line" :disabled="loading" @click="refresh" />
    </div>
    <div v-if="error" role="alert" class="fr-alert fr-alert--error">
      <p>{{ error }}</p>
      <DsfrButton label="Réessayer" secondary @click="fetchTargets" />
    </div>
    <p v-if="!error" role="status">{{ loading ? "Chargement des cibles…" : `${total} cible(s) consultable(s) pour ce filtre` }}</p>
    <RefAppTable
      v-if="!error"
      :items="targets"
      data-key="applicationId"
      :columns="columns"
      :loading="loading"
      :paginator="true"
      :lazy="true"
      :rows="pageSize"
      :first="page * pageSize"
      :total-records="total"
      :sort-field="sortBy"
      :sort-order="order === 'desc' ? -1 : 1"
      empty-message="Aucune cible consultable pour ce filtre."
      @sort="onSort"
      @page="onPage"
    >
      <template #body-label="{ data }">
        <RouterLink :to="{ name: routeNames.PROFILEAPP, params: { id: data.applicationId } }">{{ data.label }}</RouterLink>
      </template>
      <template #body-iqAtStart="{ data }">{{ data.iqAtStart ?? "Inconnu" }}</template>
      <template #body-iqCurrent="{ data }">{{ data.iqCurrent ?? "Inconnu" }}</template>
      <template #body-delta="{ data }">
        <span
          class="fr-badge fr-badge--sm"
          :class="{ 'fr-badge--success': data.delta > 0, 'fr-badge--warning': data.delta !== null && data.delta < 0 }"
        >
          {{
            data.delta === null ? "Non comparable" : data.delta === 0 ? "Stable (0)" : `${data.delta > 0 ? "+" : ""}${data.delta} points`
          }}
        </span>
      </template>
      <template #body-details="{ data }">
        <QualityCampaignTargetDetails :key="data.applicationId" :application-id="data.applicationId" :application-label="data.label" />
      </template>
    </RefAppTable>
  </div>
</template>

<style scoped>
.campaign-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
}
.campaign-toolbar .fr-select-group {
  flex: 1 1 18rem;
  max-width: 32rem;
}
</style>
