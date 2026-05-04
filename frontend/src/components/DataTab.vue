<script setup lang="ts">
import { ref, computed, watch } from "vue";
import api from "@/api/index";
import RefAppTable from "./RefAppTable.vue";
import DataSourceDetails from "./DataSourceDetails.vue";

interface DataSource {
  id: string;
  name: string;
  description?: string;
  family?: string;
  sensibility?: string;
}

const props = defineProps<{
  applicationId?: string;
  application?: { id: string };
}>();

const resolvedApplicationId = computed(() => {
  return props.applicationId ?? props.application?.id;
});

const items = ref<DataSource[]>([]);
const selectedId = ref<string | null>(null);
const loading = ref(false);
const totalRecords = ref(0);

const currentPage = ref(0);
const pageSize = ref(10);
const firstIndex = computed(() => currentPage.value * pageSize.value);

const columns = [
  { field: "name", header: "Nom", sortable: true },
  { field: "description", header: "Description", sortable: false },
  { field: "sensibility", header: "Sensibilité", sortable: true },
  { field: "family", header: "Famille", sortable: true },
];

async function fetchData(filters: { page?: number; pageSize?: number } = {}) {
  loading.value = true;
  try {
    if (!resolvedApplicationId.value) {
      console.warn("applicationId manquant");
      return;
    }

    const response = await api.dataSourceControllerFindAll({
      path: { applicationId: resolvedApplicationId.value },
      query: {
        page: filters.page ?? currentPage.value,
        pageSize: filters.pageSize ?? pageSize.value,
      },
    });

    if (response.response.ok && response.data) {
      items.value = response.data.results ?? [];
      totalRecords.value = response.data.total ?? 0;
    } else {
      items.value = [];
      totalRecords.value = 0;
      throw new Error("Failed to fetch data sources");
    }
  } catch (e) {
    console.error("Erreur lors du chargement des sources de données", e);
  } finally {
    loading.value = false;
  }
}

function onPage(event: any) {
  currentPage.value = event.page;
  pageSize.value = event.rows;
  fetchData({
    page: currentPage.value,
    pageSize: pageSize.value,
  });
}

function selectRow(data: DataSource) {
  selectedId.value = data.id;
}

function backToList() {
  selectedId.value = null;
}

watch(
  resolvedApplicationId,
  (id) => {
    if (id) {
      fetchData({
        page: currentPage.value,
        pageSize: pageSize.value,
      });
    }
  },
  { immediate: true },
);
</script>

<template>
  <div>
    <h2 class="fr-mb-2w">Sources de données</h2>

    <div v-if="!selectedId">
      <RefAppTable
        :items="items"
        :columns="columns"
        :loading="loading"
        :paginator="true"
        :lazy="true"
        :rows="pageSize"
        :first="firstIndex"
        :totalRecords="totalRecords"
        @page="onPage"
      >
        <template #body-name="{ data }">
          <a href="#" @click.prevent="selectRow(data)">
            {{ data.name }}
          </a>
        </template>

        <template #body-sensibility="{ data }">
          <span>{{ data.sensibility.label }}</span>
        </template>

        <template #body-family="{ data }">
          <span>{{ data.family.label }}</span>
        </template>
      </RefAppTable>
    </div>

    <div v-else>
      <button class="fr-btn fr-btn--secondary fr-mb-3w" @click="backToList">← Retour à la liste</button>

      <DataSourceDetails :id="selectedId" :applicationId="resolvedApplicationId" />
    </div>
  </div>
</template>
