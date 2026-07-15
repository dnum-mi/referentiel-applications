<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import api from "@/api/index";
import { Permission, type DataApplicationDto } from "@/client/types.gen";
import type { ApplicationWithPerms } from "@/models/Application";
import type { TableSortEvent } from "@/types/table";
import { useToasterStore } from "@/stores/toasterStore";
import { useUserStore } from "@/stores/userStore";
import { routeNames } from "@/router/route-names";
import RefAppTable from "@/components/RefAppTable.vue";
import DeleteConfirmationModal from "@/components/modal/DeleteConfirmationModal.vue";
import { OPEN_DATA_BADGE_CLASS, OPEN_DATA_STATUS_LABELS } from "@/constants/data-catalog.constants";
import type { OpenDataStatus } from "@/client/types.gen.js";
import DataApplicationModal from "./DataApplicationModal.vue";

const props = defineProps<{
  application: ApplicationWithPerms;
}>();

const router = useRouter();
const toaster = useToasterStore();
const userStore = useUserStore();

const canEdit = computed(() => userStore.hasPermissions([Permission.DATA_WRITE], Array.from(props.application.myPerms ?? [])));

const isCreateModalOpen = ref(false);
const itemToEdit = ref<DataApplicationDto | null>(null);
const itemToDelete = ref<DataApplicationDto | null>(null);
const isDeleteModalOpen = ref(false);
const errorMessage = ref("");

function openEditModal(item: DataApplicationDto) {
  itemToEdit.value = item;
}

function openDeleteModal(item: DataApplicationDto) {
  itemToDelete.value = item;
  isDeleteModalOpen.value = true;
}

function cancelDeletion() {
  itemToDelete.value = null;
  isDeleteModalOpen.value = false;
}

async function confirmDeletion() {
  if (!itemToDelete.value) return;
  try {
    const response = await api.dataCatalogControllerDeleteApplicationData({
      path: { applicationId: props.application.id, dataApplicationId: itemToDelete.value.id },
    });
    if (!response.response.ok) throw new Error("delete failed");
    toaster.addSuccessMessage("Donnée détachée avec succès");
    await fetchByApplication(props.application.id);
  } catch (error) {
    console.error(error);
    errorMessage.value = "Erreur lors de la suppression de la donnée.";
    toaster.addErrorMessage(errorMessage.value);
  } finally {
    itemToDelete.value = null;
    isDeleteModalOpen.value = false;
  }
}

async function onDataSaved() {
  isCreateModalOpen.value = false;
  itemToEdit.value = null;
  await fetchByApplication(props.application.id);
}

const items = ref<DataApplicationDto[]>([]);
const total = ref(0);
const isLoading = ref(false);
const currentPage = ref(0);
const pageSize = ref(15);
const firstIndex = computed(() => currentPage.value * pageSize.value);
const sortField = ref("name");
const sortOrder = ref(1); // 1 = asc, -1 = desc

async function fetchByApplication(id: string) {
  items.value = [];
  isLoading.value = true;
  try {
    const response = await api.dataCatalogControllerFindByApplication({
      path: { applicationId: id },
      query: {
        page: currentPage.value,
        pageSize: pageSize.value,
        order: sortOrder.value === -1 ? "desc" : "asc",
        sortBy: sortField.value,
      },
    });
    if (!response.response.ok) {
      toaster.addErrorMessage("Erreur lors du chargement des données de l'application.");
      return;
    }
    items.value = response.data?.results ?? [];
    total.value = response.data?.total ?? 0;
  } catch {
    toaster.addErrorMessage("Erreur lors du chargement des données de l'application.");
  } finally {
    isLoading.value = false;
  }
}

function onSort(event: TableSortEvent) {
  sortField.value = event.sortField;
  sortOrder.value = event.sortOrder;
  currentPage.value = 0;
  fetchByApplication(props.application.id);
}

function onPage(event: any) {
  currentPage.value = event.page;
  pageSize.value = event.rows;
  fetchByApplication(props.application.id);
}

const columns = computed(() => [
  { field: "name", header: "Nom", sortable: true },
  { field: "family", header: "Famille métier", sortable: true, width: "25%" },
  { field: "sensibility", header: "Sensibilité", sortable: true },
  { field: "openDataStatus", header: "Open data", sortable: true },
  { field: "isReference", header: "Référentiel", sortable: true },
  { field: "tags", header: "Tags", sortable: true },
  ...(canEdit.value ? [{ field: "actions", header: "Actions", sortable: false }] : []),
]);

interface DataRow {
  id: string;
  name: string;
  family: string;
  sensibility: string;
  _sensibilityColor: string | null;
  openDataStatus: string | null;
  isReference: boolean;
  _familyParts: string[];
  _tagsRaw: Array<{ id: string; name: string }>;
  _raw: DataApplicationDto;
}

const tableItems = computed<DataRow[]>(() =>
  items.value.map((dto) => ({
    id: dto.id,
    name: dto.dataDescription?.name ?? "",
    family: dto.dataDescription?.family?.path ?? "",
    sensibility: dto.sensibility?.label ?? "",
    _sensibilityColor: dto.sensibility?.color ?? null,
    openDataStatus: dto.openDataStatus ?? null,
    isReference: dto.isReference ?? false,
    _familyParts: dto.dataDescription?.family?.path?.split(" > ") ?? [],
    _tagsRaw: dto.dataDescription?.tags ?? [],
    _raw: dto,
  })),
);

function goToDetail(row: DataRow) {
  router.push({
    name: routeNames.DATA_APPLICATION_DETAIL,
    params: {
      applicationId: props.application.id,
      dataApplicationId: row.id,
    },
  });
}

watch(
  () => props.application.id,
  (id) => {
    if (id) {
      currentPage.value = 0;
      fetchByApplication(id);
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="fr-py-4w">
    <div class="fr-grid-row fr-grid-row--middle fr-mb-2w">
      <div class="fr-col">
        <h2 class="fr-mb-0">
          Données de l'application
          <span v-if="!isLoading" class="fr-text--sm fr-text-mention--grey fr-ml-1w">({{ total }} donnée{{ total > 1 ? "s" : "" }})</span>
        </h2>
      </div>
      <div v-if="canEdit" class="fr-col-auto">
        <DsfrButton
          tertiary
          size="sm"
          class="fr-btn--icon-left fr-icon-add-line"
          label="Ajouter"
          title="Rattacher une donnée à l'application"
          data-testid="data-application-add-btn"
          @click="isCreateModalOpen = true"
        />
      </div>
    </div>

    <RefAppTable
      :items="tableItems"
      :columns="columns"
      :loading="isLoading"
      :total-records="total"
      :paginator="true"
      :lazy="true"
      :rows="pageSize"
      :first="firstIndex"
      :sort-field="sortField"
      :sort-order="sortOrder"
      data-testid="data-application-table"
      empty-message="Aucune donnée enregistrée pour cette application."
      @sort="onSort"
      @page="onPage"
    >
      <!-- NOM — lien vers le détail -->
      <template #body-name="{ data }">
        <DsfrButton tertiary no-outline :label="data.name || '—'" @click="goToDetail(data)" />
      </template>

      <!-- FAMILLE MÉTIER — hiérarchie depuis _familyParts -->
      <template #body-family="{ data }: { data: DataRow }">
        <span v-if="!data._familyParts.length" class="fr-text-mention--grey">—</span>
        <template v-else>
          <template v-for="(part, index) in data._familyParts" :key="part">
            <span :class="{ 'family-part--last': index === data._familyParts.length - 1 }">{{ part }}</span>
            <span v-if="index < data._familyParts.length - 1" class="fr-mx-1v fr-text-mention--grey">&gt;</span>
          </template>
        </template>
      </template>

      <!-- SENSIBILITÉ — badge coloré depuis la couleur BD -->
      <template #body-sensibility="{ data }">
        <span
          v-if="data.sensibility"
          class="fr-badge"
          :style="
            data._sensibilityColor ? { backgroundColor: data._sensibilityColor, color: '#fff', borderColor: data._sensibilityColor } : {}
          "
        >
          {{ data.sensibility }}
        </span>
        <span v-else class="fr-text-mention--grey">—</span>
      </template>

      <!-- OPEN DATA — badge depuis les constantes -->
      <template #body-openDataStatus="{ data }">
        <span v-if="data.openDataStatus" class="fr-badge" :class="OPEN_DATA_BADGE_CLASS[data.openDataStatus as OpenDataStatus] ?? ''">
          {{ OPEN_DATA_STATUS_LABELS[data.openDataStatus as OpenDataStatus] ?? data.openDataStatus }}
        </span>
        <span v-else class="fr-text-mention--grey">—</span>
      </template>

      <!-- RÉFÉRENTIEL — badge source de vérité -->
      <template #body-isReference="{ data }">
        <span v-if="data.isReference" class="fr-badge fr-badge--success fr-badge--icon-left fr-icon-check-line"> Source de vérité </span>
        <span v-else class="fr-text-mention--grey">—</span>
      </template>

      <!-- TAGS — chips depuis _tagsRaw -->
      <template #body-tags="{ data }">
        <div v-if="data._tagsRaw.length" class="fr-tags-group">
          <span v-for="tag in data._tagsRaw" :key="tag.id" class="fr-tag fr-mr-1v fr-mb-1v">
            {{ tag.name }}
          </span>
        </div>
        <span v-else class="fr-text-mention--grey">—</span>
      </template>

      <!-- ACTIONS — édition / détachement -->
      <template #body-actions="{ data }: { data: DataRow }">
        <DsfrButton
          tertiary
          size="sm"
          icon="fr-icon-edit-line"
          title="Modifier"
          class="fr-mr-1w"
          :data-testid="`data-application-edit-btn-${data.id}`"
          @click="openEditModal(data._raw)"
        />
        <DsfrButton
          tertiary
          size="sm"
          icon="fr-icon-delete-bin-line"
          title="Détacher"
          :data-testid="`data-application-delete-btn-${data.id}`"
          @click="openDeleteModal(data._raw)"
        />
      </template>
    </RefAppTable>

    <DataApplicationModal
      v-if="isCreateModalOpen"
      :application-id="application.id"
      :error-message="errorMessage"
      @close="isCreateModalOpen = false"
      @data-created="onDataSaved"
    />

    <DataApplicationModal
      v-if="itemToEdit"
      :application-id="application.id"
      :initial-item="itemToEdit"
      :error-message="errorMessage"
      @close="itemToEdit = null"
      @data-updated="onDataSaved"
    />

    <DeleteConfirmationModal
      v-if="isDeleteModalOpen"
      :opened="isDeleteModalOpen"
      item-name="cette donnée"
      @confirm="confirmDeletion"
      @cancel="cancelDeletion"
    />
  </div>
</template>

<style scoped>
.family-part--last {
  font-weight: bold;
}
</style>
