<script setup lang="ts">
import Applications from "@/api/application";
import { onMounted, ref } from "vue";
import useToaster from "@/composables/use-toaster";
import type { Application } from "@/models/Application";
import { getPriorityBadgeType } from "@/composables/use-dictionary";

const toaster = useToaster;
const searchTerm = ref<string>("");
const searchResults = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");
const debounceTimeout = ref<NodeJS.Timeout | null>(null);
const displayMode = ref("table");

const headers = ["Label", "Description", "Priorité de redémarrage", "Tags"];

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
      const results = await Applications.getAllApplicationBySearch(searchTerm.value || "", currentPage.value, rowsPerPage.value);
      searchResults.value = results || [];
    } catch (error) {
      toaster.addErrorMessage(error, "Une erreur est survenue lors du chargement des applications.");
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
  }));
});

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
      <button @click="displayMode = 'table'">Mode Tableau</button>
      <button @click="displayMode = 'tiles'">Mode Tuiles</button>
    </div>

    <div v-if="searchResults.length && displayMode === 'table'" class="table-container">
      <DsfrDataTable
        :headers-row="headers"
        :rows="rows"
        v-model:current-page="currentPage"
        v-model:rows-per-page="rowsPerPage"
        pagination
        :pagination-options="[5, 15, 30, 50]"
        sortable-rows
        sorted="Priorité de redémarrage"
        vertical-borders
      >
        <template #cell="{ colKey, cell }">
          <template v-if="colKey === 'Label'">
            <router-link :to="{ name: 'application', params: { id: cell.id } }">
              {{ cell.label }}
              <span v-if="cell.shortName" class="fr-text--sm fr-text--grey"> ({{ cell.shortName }}) </span>
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
