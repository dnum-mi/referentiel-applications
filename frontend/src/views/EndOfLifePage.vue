<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useEndOfLifeStore, type EndOfLifeQuery } from "@/stores/endOfLifeStore";
import { useDebounceFn } from "@vueuse/core";
import PaginationFooter from "@/components/PaginationFooter.vue";
import RefAppTable from "@/components/RefAppTable.vue";
import { routeNames } from "@/router/route-names";
import type { TableColumn, TableSortEvent } from "@/types/table";
import type { EndOfLifeApplicationDto, EndOfLifeTechnologyDto } from "@/client/types.gen";
import { EOL_STATUS_BADGE_TYPE, EOL_STATUS_LABELS } from "@/utils/eol-status";

type EolStatus = EndOfLifeTechnologyDto["status"];

/**
 * Vue transverse des fins de vie (#2236).
 *
 * Le suivi n'existait que fiche par fiche : impossible de répondre à « quelles
 * applications de ma direction utilisent une technologie en fin de vie ? » sans
 * ouvrir chaque fiche une à une.
 *
 * Le h1 reprend l'entrée de menu « Technologies » (#2413) : RGAA, le titre d'une
 * page doit correspondre à sa navigation. L'objet de la page, le suivi des fins
 * de vie, est dit par le paragraphe d'introduction.
 */
const store = useEndOfLifeStore();
const { applications, total, isLoading } = storeToRefs(store);

const statusFilter = ref<EolStatus | "">("");
const organizationFilter = ref("");
const searchFilter = ref("");
const pageSize = ref(15);
const currentPage = ref(0);
// #2522 : l'état de tri porte le CHAMP DE COLONNE (« Application »), pour que l'en-tête reflète
// le tri initial et que le premier clic l'inverse ; la traduction vers la clé backend se fait
// à l'envoi.
const sortField = ref<string>("Application");
const SORT_KEYS: Record<string, "label" | "shortName"> = { Application: "label" };
const sortOrder = ref<1 | -1>(1);

// Libellés partagés avec la fiche (#2528).
const STATUS_LABELS = EOL_STATUS_LABELS;

/** Le libellé du filtre dit ce que le statut recouvre, l'intitulé seul étant ambigu. */
const statusOptions = [
  { value: "", text: "Tous les statuts" },
  { value: "eol", text: "Fin de vie dépassée" },
  { value: "eol-soon", text: "Fin de vie dans moins de 6 mois" },
  { value: "eoas-passed", text: "Sortie du support actif" },
];

const columns: TableColumn[] = [
  { field: "Application", header: "Application", sortable: true },
  { field: "Organisations", header: "Organisations", sortable: false },
  { field: "Technologies", header: "Technologies concernées", sortable: false },
];

const firstIndex = computed(() => currentPage.value * pageSize.value);

// RGAA (7.5) : nombre de résultats restitué aux technologies d'assistance.
const statusMessage = computed(() => {
  if (isLoading.value) return "Chargement des applications concernées…";
  if (total.value === 0) return "Aucune application concernée : Résultat 0 à 0";
  const from = firstIndex.value + 1;
  const to = Math.min(firstIndex.value + applications.value.length, total.value);
  return `Résultat ${from} à ${to} sur ${total.value}`;
});

function fetchApplications() {
  const query: EndOfLifeQuery = {
    page: currentPage.value,
    pageSize: pageSize.value,
    sortBy: SORT_KEYS[sortField.value] ?? "label",
    order: sortOrder.value === 1 ? "asc" : "desc",
  };
  // Les filtres vides sont OMIS, jamais envoyés en chaîne vide : côté serveur
  // `status: ""` échouerait la validation d'énumération.
  if (statusFilter.value) query.status = statusFilter.value;
  if (organizationFilter.value.trim()) query.organization = organizationFilter.value.trim();
  if (searchFilter.value.trim()) query.search = searchFilter.value.trim();
  return store.fetchApplications(query);
}

// Tout changement de filtre ramène en page 0 : rester page 3 d'un résultat qui
// n'en compte plus qu'une afficherait une liste vide sans explication.
function onFilterChange() {
  currentPage.value = 0;
  fetchApplications();
}

// UN SEUL watcher débouncé sur les trois filtres, et non un par filtre : « Effacer »
// les remet tous à zéro d'un coup, ce qui déclencherait autant de requêtes que de
// filtres modifiés. Le debounce agrège la rafale en un seul appel.
const debouncedFilterChange = useDebounceFn(onFilterChange, 300);

watch([statusFilter, organizationFilter, searchFilter], debouncedFilterChange);

function onSort(event: TableSortEvent) {
  sortField.value = event.sortField ?? "Application";
  sortOrder.value = event.sortOrder === -1 ? -1 : 1;
  currentPage.value = 0;
  fetchApplications();
}

function handlePageChange(page: number) {
  currentPage.value = page;
  fetchApplications();
}

function handlePageSizeChange(limit: number) {
  pageSize.value = limit;
  currentPage.value = 0;
  fetchApplications();
}

/** La remise à zéro suffit : le watcher débouncé déclenche l'unique rechargement. */
function clearFilters() {
  statusFilter.value = "";
  organizationFilter.value = "";
  searchFilter.value = "";
}

// Date calendaire stockée à minuit UTC : formatée en UTC pour afficher le même jour
// que la fiche, quel que soit le fuseau du navigateur.
function formatDate(value?: string | Date | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR", { timeZone: "UTC" });
}

/** Résumé lisible d'une technologie : « PostgreSQL 13 » plutôt que deux colonnes. */
function technologyLabel(technology: EndOfLifeTechnologyDto): string {
  return technology.version ? `${technology.product} ${technology.version}` : technology.product;
}

const tableRows = computed(() =>
  applications.value.map((application: EndOfLifeApplicationDto) => ({
    id: application.id,
    Application: {
      id: application.id,
      label: application.label,
      shortName: application.shortName,
      worstStatus: application.worstStatus,
    },
    Organisations: application.organizationPaths,
    Technologies: application.technologies,
  })),
);

onMounted(fetchApplications);
</script>

<template>
  <div class="fr-container--fluid fr-px-2w" data-testid="end-of-life-page">
    <h1 data-testid="end-of-life-page-title">Technologies</h1>
    <p class="fr-text--sm fr-mb-3w">
      Suivi des fins de vie des technologies : applications dont au moins une technologie est en fin de vie, le sera dans moins de 6 mois,
      ou n'est plus couverte par le support actif. Les dates proviennent d'endoflife.date, sauf mention « saisie manuelle ».
    </p>

    <form class="fr-mb-3w" @submit.prevent="onFilterChange">
      <div class="fr-grid-row fr-grid-row--gutters fr-mb-1w">
        <div class="fr-col-12 fr-col-md-4">
          <DsfrSelect
            v-model="statusFilter"
            label="Statut"
            label-visible
            :options="statusOptions"
            data-testid="end-of-life-filter-status"
          />
        </div>
        <div class="fr-col-12 fr-col-md-4">
          <DsfrInputGroup
            v-model="organizationFilter"
            label="Organisation"
            label-visible
            placeholder="Chemin ou sigle (ex. MI/DNUM)"
            data-testid="end-of-life-filter-organization"
          />
        </div>
        <div class="fr-col-12 fr-col-md-4">
          <DsfrInputGroup
            v-model="searchFilter"
            label="Recherche"
            label-visible
            placeholder="Application ou produit"
            data-testid="end-of-life-filter-search"
          />
        </div>
      </div>
      <div class="fr-btns-group fr-btns-group--inline">
        <DsfrButton
          type="button"
          secondary
          label="Effacer les filtres"
          :disabled="isLoading"
          title="Effacer les filtres"
          data-testid="end-of-life-clear-filters"
          @click="clearFilters"
        />
      </div>
    </form>

    <div aria-live="polite" aria-atomic="true" class="fr-sr-only" data-testid="end-of-life-status">
      <p>{{ statusMessage }}</p>
    </div>

    <div v-if="!isLoading && tableRows.length === 0" class="text-center fr-mb-3w" data-testid="end-of-life-empty">
      <p>Aucune application concernée.</p>
    </div>

    <div v-else data-testid="end-of-life-table-region">
      <RefAppTable
        :items="tableRows"
        :columns="columns"
        :loading="isLoading"
        :lazy="true"
        :total-records="total"
        :sort-field="sortField"
        :sort-order="sortOrder"
        data-testid="end-of-life-table"
        empty-message="Aucune application concernée."
        @sort="onSort"
      >
        <template #body-Application="{ data: row }">
          <router-link
            :to="{ name: routeNames.PROFILEAPP, params: { id: row.Application.id, tab: 'tab-technologies' } }"
            :data-testid="`end-of-life-row-${row.Application.id}-link`"
          >
            {{ row.Application.label }}
          </router-link>
          <span v-if="row.Application.shortName" class="fr-text--xs fr-ml-1w"> ({{ row.Application.shortName }}) </span>
          <!-- #2528 : `worstStatus` était reçu mais jamais affiché. -->
          <DsfrBadge
            :type="EOL_STATUS_BADGE_TYPE[row.Application.worstStatus as EolStatus]"
            :label="STATUS_LABELS[row.Application.worstStatus as EolStatus]"
            small
            class="fr-ml-1w"
            :title="`Statut le plus grave de l'application : ${STATUS_LABELS[row.Application.worstStatus as EolStatus]}`"
            :data-testid="`end-of-life-worst-${row.Application.id}`"
          />
        </template>

        <template #body-Organisations="{ data: row }">
          <span v-if="row.Organisations.length === 0" class="fr-text--xs">—</span>
          <span v-else class="fr-text--xs">{{ row.Organisations.join(", ") }}</span>
        </template>

        <template #body-Technologies="{ data: row }">
          <ul class="fr-m-0 fr-p-0 eol-technologies">
            <li v-for="technology in row.Technologies" :key="technology.id" class="fr-mb-1v">
              <DsfrBadge
                :type="EOL_STATUS_BADGE_TYPE[technology.status as EolStatus]"
                :label="STATUS_LABELS[technology.status as EolStatus]"
                small
                :data-testid="`end-of-life-badge-${technology.id}`"
              />
              <span class="fr-ml-1w">{{ technologyLabel(technology) }}</span>
              <span class="fr-text--xs fr-ml-1w">
                <template v-if="technology.status === 'eoas-passed'">
                  support actif clos le {{ formatDate(technology.eoasDate) }}
                </template>
                <template v-else>fin de vie le {{ formatDate(technology.eolDate) }}</template>
                <template v-if="technology.latestVersion"> — dernière version : {{ technology.latestVersion }} </template>
              </span>
              <!-- #2454 : l'origine est signalée, le classement reste celui d'une date calculée. -->
              <span
                v-if="technology.eolSource === 'manual'"
                class="fr-text--xs fr-ml-1w"
                title="Date renseignée à la main, non vérifiée auprès d’endoflife.date"
                :data-testid="`end-of-life-manual-${technology.id}`"
              >
                (saisie manuelle<span class="fr-sr-only"> : date renseignée à la main, non vérifiée auprès d’endoflife.date</span>)
              </span>
            </li>
          </ul>
        </template>
      </RefAppTable>

      <PaginationFooter
        :total-filtered="total"
        :limit="pageSize"
        :page="currentPage"
        data-testid="end-of-life-pagination-footer"
        @update:limit="handlePageSizeChange"
        @update:page="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped>
.eol-technologies {
  list-style: none;
}
</style>
