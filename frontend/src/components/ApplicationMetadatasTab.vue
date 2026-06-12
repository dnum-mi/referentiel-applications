<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import type { ApplicationWithPerms } from "@/models/Application";
import { useMetadataStore } from "@/stores/metadataStore";
import { useRoute } from "vue-router";
import type { MetadataDto } from "@/client/types.gen";
import type { TableColumn } from "@/types/table";

const props = defineProps<{ application: ApplicationWithPerms }>();

const route = useRoute();
const metadataStore = useMetadataStore();

const currentPage = ref(0);
const pageSize = ref(5);
const firstIndex = computed(() => currentPage.value * pageSize.value);

const tableColumns: TableColumn[] = [
  { field: "Date", header: "Date", sortable: false },
  { field: "Auteur", header: "Auteur", sortable: false },
  { field: "Titre", header: "Titre", sortable: false },
  { field: "Actions", header: "Actions", sortable: false },
];

async function fetchMetadatas() {
  await metadataStore.fetchMetadatasByApplication(props.application.id, {
    page: currentPage.value,
    pageSize: pageSize.value,
    sortBy: "createdAt",
    order: "desc",
  });
}

watch([currentPage, pageSize], fetchMetadatas);
onMounted(fetchMetadatas);

function onPage(event: any) {
  currentPage.value = event.page;
  pageSize.value = event.rows;
}

function getTitle(meta: MetadataDto): string {
  return (meta.description || "").split("\n")[0];
}

const metadataRows = computed(() => {
  return (metadataStore.metadatas || []).map((metadata: MetadataDto) => ({
    Date: new Date(metadata.createdAt).toLocaleDateString("fr-FR"),
    Auteur: metadata.createdBy?.email || "Inconnu",
    Titre: getTitle(metadata),
    Actions: {
      id: metadata.id,
    },
  }));
});

const loading = computed(() => metadataStore.isLoading);
</script>

<template>
  <AppLoader v-if="loading" data-testid="modifications-loader" />
  <div v-else>
    <p>Nombre de consultations de l'application sur les 12 derniers mois : {{ application?.views }}</p>
    <RefAppTable
      :items="metadataRows"
      :columns="tableColumns"
      :paginator="true"
      :lazy="true"
      :rows="pageSize"
      :first="firstIndex"
      :total-records="metadataStore.total"
      data-testid="modifications-table"
      empty-message="Aucune modification enregistrée."
      @page="onPage"
    >
      <template #body-Actions="{ data }">
        <router-link
          :to="{ name: 'metadata-detail', params: { id: data.Actions.id }, query: { from: route.fullPath } }"
          class="fr-btn fr-btn--secondary fr-btn--sm"
          data-testid="modifications-see-more-button"
        >
          Voir plus
        </router-link>
      </template>
    </RefAppTable>
  </div>
</template>
