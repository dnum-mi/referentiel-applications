<script setup lang="ts">
import api from "@/api";
import type { ActorControllerFindAllData, ActorDto, ApplicationRefDto, PaginatedActorDto } from "@/client/types.gen";
import RefAppTable from "@/components/RefAppTable.vue";
import OrgaLink from "@/components/organization/OgaLink.vue";
import { useActorTypeStore } from "@/stores/actorTypeStore";
import type { TableColumn, TableSortEvent } from "@/types/table";
import type { DsfrDataTableHeaderCellObject } from "@gouvminint/vue-dsfr";
import type { DataTablePageEvent } from "primevue/datatable";
import { watchDebounced } from "@vueuse/core";
import { computed, onMounted, ref, watch } from "vue";
import AdminActorActions from "./AdminActorActions.vue";

const actorTypeStore = useActorTypeStore();

// L'API renvoie l'application liée, non déclarée dans ActorDto.
type ActorRow = ActorDto & { application?: ApplicationRefDto | null };

const data = ref<PaginatedActorDto>({ results: [], total: 0 });

const headers = [
  { key: "email", label: "Email", isSortable: true },
  { key: "application", label: "Application", isSortable: true },
  { key: "firstname", label: "Prénom", isSortable: true },
  { key: "lastname", label: "Nom", isSortable: true },
  { key: "actorType", label: "Type", isSortable: false },
  { key: "organization", label: "Organisation", isSortable: true },
  { key: "isGroup", label: "Rattaché(e)", isSortable: false },
  { key: "actions", label: "Actions", isSortable: false },
] as const satisfies (DsfrDataTableHeaderCellObject & { isSortable?: boolean })[];

const tableColumns: TableColumn[] = headers.map((h) => ({
  field: h.key,
  header: h.label,
  sortable: h.isSortable || false,
}));

const isLoading = ref(false);
const searchQuery = ref("");

const sortColumn = ref<(typeof headers)[number]["key"]>("email");
const isSortDescending = ref(false);

const itemsPerPage = ref(15);
const currentPage = ref(0);
const firstIndex = computed(() => currentPage.value * itemsPerPage.value);

function getActorTypeLabel(actorTypeId: string): string {
  const type = actorTypeStore.actorTypes.find((t) => t.id === actorTypeId);
  return type ? type.label : "-";
}

async function fetchActors() {
  isLoading.value = true;

  const query: NonNullable<ActorControllerFindAllData["query"]> = {
    search: searchQuery.value || undefined,
    page: currentPage.value,
    pageSize: itemsPerPage.value,
    sortBy: sortColumn.value,
    order: isSortDescending.value ? "desc" : "asc",
  };

  const response = await api.actorControllerFindAll({ query });
  if (!response.data) {
    isLoading.value = false;
    return;
  }

  data.value = response.data;
  isLoading.value = false;
}

watchDebounced(
  searchQuery,
  async () => {
    currentPage.value = 0;
    await fetchActors();
  },
  { debounce: 300 },
);

watch([sortColumn, isSortDescending], () => {
  currentPage.value = 0;
  fetchActors();
});

const tableRows = computed(() =>
  data.value.results.map((actor: ActorRow) => ({
    email: actor.email || "-",
    firstname: actor.firstname || "-",
    lastname: actor.lastname || "-",
    actorType: getActorTypeLabel(actor.actorTypeId),
    organization: actor.organizationId,
    application: actor.application || null,
    isGroup: actor.isGroup ? "Oui" : "Non",
    actions: actor,
  })),
);

function onSort(event: TableSortEvent) {
  sortColumn.value = event.sortField as (typeof headers)[number]["key"];
  isSortDescending.value = event.sortOrder === -1;
}

function onPage(event: DataTablePageEvent) {
  currentPage.value = event.page;
  itemsPerPage.value = event.rows;
  fetchActors();
}

onMounted(async () => {
  await actorTypeStore.fetchAll();
  await fetchActors();
});
</script>

<template>
  <div>
    <h1 class="fr-h1" data-testid="admin-actors-title">Gestion des acteurs</h1>

    <div class="fr-mb-4w">
      <DsfrSearchBar
        v-model.trim="searchQuery"
        label="Rechercher un acteur"
        placeholder="Rechercher par email, prénom, nom ou application..."
        button-text="Rechercher"
        class="fr-col-12"
        data-testid="admin-actor-search"
      />
    </div>

    <div v-if="isLoading" class="fr-alert fr-alert--info" data-testid="admin-actors-loading">
      <p>Chargement des acteurs...</p>
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
        :sort-field="sortColumn"
        :sort-order="isSortDescending ? -1 : 1"
        data-testid="admin-actors-table"
        @sort="onSort"
        @page="onPage"
      >
        <template #body-application="{ data: { application } }">
          <RouterLink v-if="application" :to="`/applications/${application.id}`">{{ application.label }}</RouterLink>
          <template v-else>-</template>
        </template>

        <template #body-organization="{ data: { organization } }">
          <OrgaLink v-if="organization" :organization-id="organization" />
          <template v-else>-</template>
        </template>

        <template #body-actorType="{ data: { actorType } }">
          <DsfrTag v-if="actorType && actorType !== '-'" :label="String(actorType)" small />
          <template v-else>-</template>
        </template>

        <template #header-isGroup>
          <DsfrTooltip
            on-hover
            content="Établir le lien entre une personne physique et une boîte e-mail fonctionnelle (ex: equipe, service)"
          >
            Rattaché(e)
          </DsfrTooltip>
        </template>

        <template #body-actions="{ data: { actions } }">
          <AdminActorActions :actor="actions" :actor-types="actorTypeStore.actorTypes" @updated="fetchActors" />
        </template>
      </RefAppTable>
    </div>
  </div>
</template>
