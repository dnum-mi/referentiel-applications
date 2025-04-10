<script setup lang="ts">
import Applications from "@/api/application";
import { onMounted, ref, getCurrentInstance } from "vue";
import useToaster from "@/composables/use-toaster";
import { getPriorityBadgeType } from "@/composables/use-dictionary";
import Sites from "@/api/sites";
import { applicationFieldsDict } from "@/composables/use-dictionary";
import { customSorter } from "@/utils/tableSort";

const instance = getCurrentInstance();

const trackSearch = (query: string, source: string, resultCount: number) => {
  const matomo = instance?.proxy?.$matomo;
  console.log(instance?.proxy?.$matomo);
  if (!matomo) {
    console.warn("Matomo non dispo");
    return;
  }
  const encoded = encodeURIComponent(query.trim());
  matomo.setCustomUrl(`/search?q=${encoded}`);
  matomo.trackSiteSearch(query.trim(), "Applications", resultCount);
  matomo.trackPageView(`Recherche depuis ${source} : ${query}`);
};
const toaster = useToaster();
const searchTerm = ref<string>("");
const searchResults = ref<any[]>([]);
const isLoading = ref(false);
const errorMessage = ref("");
const debounceTimeout = ref<NodeJS.Timeout | null>(null);
const isTiles = ref(false);
const updateMode = () => {
  const mobile = window.matchMedia("(max-width: 768px)").matches;
  isTiles.value = mobile;
};

const currentSortedColumn = ref("");

onMounted(() => {
  updateMode();
  window.addEventListener("resize", updateMode);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateMode);
});
const displayMode = computed(() => (isTiles.value ? "tiles" : "table"));

const headers = ["Nom court", "Description", "Priorité de redémarrage", "Hébergement", "Tags"];

const currentPage = ref(0);
const rowsPerPage = ref(15);

async function doSearch() {
  if (debounceTimeout.value) {
    clearTimeout(debounceTimeout.value);
  }
  debounceTimeout.value = setTimeout(async () => {
    try {
      isLoading.value = true;
      errorMessage.value = "";
      currentPage.value = 0;

      const searchValue = searchTerm.value || "";
      const sitePrefix = "site:";

      if (searchValue.toLowerCase().includes(sitePrefix)) {
        const parts = searchValue.split(sitePrefix);
        const site = parts[1].trim().split(" ")[0];
        if (site) {
          const hostings = await Sites.getApplications(site);
          searchResults.value = hostings.map((h) => h.application);
        } else {
          searchResults.value = [];
        }
      } else {
        const results = await Applications.getAllApplicationBySearch(searchValue, currentPage.value, rowsPerPage.value);
        searchResults.value = results || [];
        const query = searchTerm.value.trim();
        const resultCount = searchResults.value.length;

        console.log("Résultats de la recherche :", searchResults.value);

        trackSearch(query, "la liste", resultCount);
      }
    } catch (error) {
      console.error(error);
      toaster.addErrorMessage("Une erreur est survenue lors du chargement des applications.");
    } finally {
      isLoading.value = false;
    }
  }, 300);
}

const rows = computed(() => {
  return searchResults.value.map((app) => ({
    id: app.id,
    label: app.label || "-",
    description: app.description || "-",
    tags: app.tags ? app.tags.join(", ") : "-",
    shortName: app.shortName || "",
    priorityRestart: app.priorityRestart || "-",
    hosting: app.hosting ? app.hosting.map((h) => `${h.site} - ${h.platform}`).join(", ") : "-",
  }));
});

function sorter(a: unknown, b: unknown) {
  return customSorter(a, b, currentSortedColumn.value, applicationFieldsDict);
}

onMounted(async () => {
  await doSearch();
});
</script>

<template>
  <div>
    <div class="controls">
      <DsfrSearchBar
        v-model="searchTerm"
        :hide-icon="true"
        label="Rechercher une application"
        placeholder="Rechercher une application"
        @input="doSearch"
      />
      <div class="flex flex-col space-y-4 fr-m-3v">
        <DsfrToggleSwitch v-model="isTiles" active-text="Mode Tuiles" inactive-text="Mode Tableau" />

        <div v-if="displayMode === 'table'"></div>
        <div v-else></div>
      </div>
    </div>

    <div v-if="searchResults.length && displayMode === 'table'" class="table-container">
      <DsfrDataTable
        :headers-row="headers"
        :rows="rows"
        v-model:current-page="currentPage"
        v-model:rows-per-page="rowsPerPage"
        pagination
        :pagination-options="[5, 15, 30, 50, 100, 200]"
        sortable-rows
        :sortFn="sorter"
        v-model:sortedBy="currentSortedColumn"
        vertical-borders
      >
        <template #cell="{ colKey, cell }">
          <template v-if="colKey === 'Nom court'">
            <router-link :to="{ name: 'application', params: { id: cell.id } }" class="truncate">
              {{ cell.shortName.length ? cell.shortName : cell.label }}
            </router-link>
          </template>
          <template v-else-if="colKey === 'Description'">
            <span class="truncate">{{ cell.description }}</span>
          </template>
          <template v-else-if="colKey === 'Priorité de redémarrage'">
            <DsfrBadge
              :label="getPriorityBadgeType(cell.priorityRestart).label"
              :type="getPriorityBadgeType(cell.priorityRestart).type"
              :title="getPriorityBadgeType(cell.priorityRestart).tooltip"
              :aria-label="`Priorité de redémarrage : ${getPriorityBadgeType(cell.priorityRestart).tooltip}`"
            />
          </template>
          <template v-else-if="colKey === 'Hébergement'">
            <span class="truncate">{{ cell.hosting }}</span>
          </template>
          <template v-else-if="colKey === 'Tags'">
            <span class="truncate">{{ cell.tags }}</span>
          </template>
        </template>
      </DsfrDataTable>
    </div>
    <div v-else-if="searchResults.length && displayMode !== 'table'" class="card-container">
      <DsfrCard
        class="fixed-card"
        v-for="(app, index) in searchResults"
        :key="index"
        :title="app.label || 'Application'"
        :img-src="app.logo || ''"
        :to="{ name: 'application', params: { id: app.id } }"
      />
    </div>

    <div v-if="isLoading" class="loading-message">Chargement...</div>

    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>

    <div v-else-if="!isLoading && !searchResults.length && searchTerm">
      <p>Aucun résultat trouvé pour "{{ searchTerm }}".</p>
    </div>
  </div>
</template>

<style scoped>
.card-container {
  margin: 2em;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.fixed-card {
  height: 300px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.fixed-card .card-content {
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.truncate {
  display: inline-block;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
