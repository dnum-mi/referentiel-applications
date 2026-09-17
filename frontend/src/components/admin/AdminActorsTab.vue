<script setup lang="ts">
import api from "@/api";
import type { ActorDto, ApplicationRefDto } from "@/client/types.gen";
import RefAppTable from "@/components/RefAppTable.vue";
import { useServerPaginatedTable } from "@/composables/use-server-paginated-table";
import OrgaLink from "@/components/organization/OgaLink.vue";
import { useActorTypeStore } from "@/stores/actorTypeStore";
import type { TableColumn } from "@/types/table";
import type { DsfrDataTableHeaderCellObject } from "@gouvminint/vue-dsfr";
import { watchDebounced } from "@vueuse/core";
import { computed, onMounted, ref } from "vue";
import AdminActorActions from "./AdminActorActions.vue";

const actorTypeStore = useActorTypeStore();

// L'API renvoie l'application liée, non déclarée dans ActorDto.
type ActorRow = ActorDto & { application?: ApplicationRefDto | null };

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

const searchQuery = ref("");
const {
  data,
  isLoading,
  itemsPerPage,
  firstIndex,
  sortColumn,
  isSortDescending,
  onSort,
  onPage,
  resetAndFetch,
  refresh: fetchActors,
  statusMessage: createStatusMessage,
} = useServerPaginatedTable<ActorRow>({
  initialSortColumn: "email",
  fetchPage: async (pagination) => {
    const response = await api.actorControllerFindAll({
      query: { ...pagination, search: searchQuery.value || undefined },
    });
    return response.data;
  },
});
const statusMessage = createStatusMessage("acteurs");

watchDebounced(searchQuery, resetAndFetch, { debounce: 300 });

function getActorTypeLabel(actorTypeId: string): string {
  const type = actorTypeStore.actorTypes.find((t) => t.id === actorTypeId);
  return type ? type.label : "-";
}

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

    <div aria-live="polite" aria-atomic="true" class="fr-sr-only" data-testid="admin-actors-status">
      <p>{{ statusMessage }}</p>
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
