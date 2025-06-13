<script lang="ts" setup>
import Applications from "@/api/application";
import { computed, onMounted, ref } from "vue";

const applications = ref([]);
const searchTerm = ref("");
const sortColumn = ref("label");
const sortDirection = ref<"asc" | "desc">("asc");
const currentPage = ref(1);
const maxPerPage = ref(10);
const totalItems = ref(0);
const totalPages = ref(1);
const isLoading = ref(false);

const headers = ref([
  { key: "label", title: "Nom", sortable: true },
  { key: "organisationCode", title: "Organisme propriétaire", sortable: true },
  // Add more headers as needed
]);

const tableRows = computed(() => {
  return applications.value.map((app) => {
    return headers.value.map((header) => app[header.key] || "");
  });
});

async function fetchApplications() {
  isLoading.value = true;
  try {
    const params = {
      searchQuery: searchTerm.value,
      sortColumn: sortColumn.value,
      sortDirection: sortDirection.value,
      currentPage: currentPage.value,
      maxPerPage: maxPerPage.value,
    };
    const response = await Applications.getApplications(params);
    applications.value = response.data;
    totalItems.value = response.totalCount;
    totalPages.value = Math.ceil(totalItems.value / maxPerPage.value);
  } catch (error) {
    console.error("Error fetching applications:", error);
  } finally {
    isLoading.value = false;
  }
}

function onSearch() {
  currentPage.value = 1;
  fetchApplications();
}

function handleSort(columnKey: string) {
  if (sortColumn.value === columnKey) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  } else {
    sortColumn.value = columnKey;
    sortDirection.value = "asc";
  }
  fetchApplications();
}

function changePage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    fetchApplications();
  }
}

async function exportToCSV() {
  try {
    const allApplications = await Applications.getAllApplications();
    if (!allApplications.length) {
      console.log("Aucune application à exporter.");
      return;
    }

    const csvContent = [
      "ID,Nom,Organisme propriétaire", // CSV headers
      ...allApplications.map((app) => `${app.id},"${app.label}","${app.organisationCode || ""}"`),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "applications.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error exporting to CSV:", error);
  }
}

onMounted(() => {
  fetchApplications();
});
</script>

<template>
  <div>
    <!-- Export Button -->
    <div class="button-group fr-mb-2w">
      <DsfrButton label="Exporter en CSV" icon="ri-download-line" @click="exportToCSV" />
    </div>

    <!-- Search Bar -->
    <div class="search-container">
      <DsfrSearchBar v-model="searchTerm" label="Rechercher une application" placeholder="Rechercher une application" @input="onSearch" />
    </div>

    <!-- Applications Table -->
    <DsfrTable :headers="headers.title" :rows="tableRows" :sort-column="sortColumn" :sort-direction="sortDirection" @sort="handleSort">
      <template #cell="{ row, columnIndex }">
        <span>{{ row[columnIndex] }}</span>
      </template>
    </DsfrTable>

    <!-- Pagination Controls -->
    <div id="pagination" class="fr-pagination">
      <DsfrButton label="Précédent" icon="ri-arrow-left-line" :disabled="currentPage <= 1" @click="changePage(currentPage - 1)" />
      <span id="pageNumbers">Page {{ currentPage }} sur {{ totalPages }}</span>
      <DsfrButton label="Suivant" icon="ri-arrow-right-line" :disabled="currentPage >= totalPages" @click="changePage(currentPage + 1)" />
    </div>
  </div>
</template>

<style scoped>
.button-group {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1em;
}

.search-container {
  margin-bottom: 1em;
}

#pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
}

#pagination .fr-btn {
  margin: 0 5px;
}

#pageNumbers {
  margin: 0 10px;
  font-size: 18px;
}
</style>
