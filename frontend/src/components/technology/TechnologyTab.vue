<script setup lang="ts">
import api from "@/api/index";
import { type TechnologyDto, Permission } from "@/client/types.gen";
import useModal from "@/composables/use-modal";
import type { APP_PERMISSIONS, Application } from "@/models/Application";
import { useToasterStore } from "@/stores/toasterStore";
import { useUserStore } from "@/stores/userStore";
import type { TableColumn } from "@/types/table";
import { computed, nextTick, onBeforeMount, ref } from "vue";
import RefAppTable from "../RefAppTable.vue";
import TechnologyForm from "./TechnologyForm.vue";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  application: Application & { myPerms: Set<APP_PERMISSIONS> };
  isMobile?: boolean;
}>();

const userStore = useUserStore();
const toaster = useToasterStore();
const technologyModal = useModal<TechnologyDto>();

const technologies = ref<TechnologyDto[]>([]);
const loading = ref(false);
const showDeleteConfirmation = ref(false);
const technologyToDelete = ref<TechnologyDto | null>(null);
const statusMessage = ref("");
const lastTrigger = ref<HTMLElement | null>(null);

const canEdit = computed(() => userStore.hasPermissions([Permission.APP_WRITE], Array.from(props.application.myPerms)));

const columns: TableColumn[] = [
  { field: "Technologie", header: "Technologie", sortable: true },
  { field: "Version", header: "Version", sortable: true },
  { field: "FinDeVie", header: "Fin de vie", sortable: true },
  { field: "Actions", header: "Actions", sortable: false },
];

function formatEol(value?: string | Date | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("fr-FR");
}

const tableRows = computed(() =>
  technologies.value.map((techno) => {
    const eol = techno.eolDate ? new Date(techno.eolDate) : null;
    return {
      id: techno.id,
      Technologie: techno.technology,
      Version: techno.version || "—",
      FinDeVie: formatEol(techno.eolDate),
      isEol: eol ? eol.getTime() < Date.now() : false,
      Actions: {
        edit: () => technologyModal.openModal(techno),
        remove: () => askDelete(techno),
      },
    };
  }),
);

async function fetchTechnologies(applicationId: string) {
  const response = await api.technologyControllerFindAll({ path: { applicationId } });
  technologies.value = response.data ?? [];
}

function rememberTrigger(event: Event) {
  lastTrigger.value = (event.currentTarget as HTMLElement) ?? null;
}

onBeforeMount(async () => {
  loading.value = true;
  try {
    await fetchTechnologies(props.application.id);
  } finally {
    loading.value = false;
  }
});

async function handleSave(technology: { id?: string; technology: string; version?: string | null }) {
  loading.value = true;
  technologyModal.closeModal();
  try {
    if (technology.id) {
      await api.technologyControllerUpdate({
        path: { applicationId: props.application.id, id: technology.id },
        body: { technology: technology.technology, version: technology.version },
      });
    } else {
      await api.technologyControllerCreate({
        path: { applicationId: props.application.id },
        body: { technology: technology.technology, version: technology.version },
      });
    }
    await fetchTechnologies(props.application.id);
    statusMessage.value = "Technologie sauvegardée avec succès !";
    toaster.addSuccessMessage("Technologie sauvegardée avec succès !");
    await nextTick();
    lastTrigger.value?.focus();
  } catch {
    toaster.addErrorMessage("Erreur lors de la sauvegarde de la technologie.");
  } finally {
    loading.value = false;
  }
}

function askDelete(technology: TechnologyDto) {
  technologyToDelete.value = technology;
  showDeleteConfirmation.value = true;
}

async function confirmDelete() {
  if (!technologyToDelete.value) return;
  try {
    await api.technologyControllerDelete({
      path: { applicationId: props.application.id, id: technologyToDelete.value.id },
    });
    await fetchTechnologies(props.application.id);
    toaster.addSuccessMessage("Technologie supprimée avec succès !");
  } catch {
    toaster.addErrorMessage("Erreur lors de la suppression de la technologie.");
  } finally {
    showDeleteConfirmation.value = false;
    technologyToDelete.value = null;
  }
}

function cancelDelete() {
  showDeleteConfirmation.value = false;
  technologyToDelete.value = null;
}
</script>

<template>
  <p class="fr-sr-only" aria-live="polite" aria-atomic="true" data-testid="technology-status">{{ statusMessage }}</p>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w" v-bind="$attrs" data-testid="technology-tab">
    <div class="fr-col">
      <h3 class="fr-mb-0">Stack technique</h3>
    </div>
    <div class="fr-col-auto">
      <DsfrButton
        type="button"
        title="Ajouter une technologie à l’application"
        aria-label="Ajouter une technologie"
        class="fr-btn--icon-left fr-icon-add-line"
        :disabled="!canEdit"
        data-testid="technology-add-btn"
        @click="
          (e) => {
            rememberTrigger(e);
            technologyModal.openCreateModal();
          }
        "
      >
        Ajouter une technologie
      </DsfrButton>
    </div>
  </div>

  <AppLoader v-if="loading" data-testid="technology-loader"></AppLoader>

  <div v-else-if="technologies.length === 0" class="text-center" data-testid="technology-empty-state">
    <p>Aucune technologie renseignée.</p>
  </div>

  <RefAppTable v-else :items="tableRows" :columns="columns" data-test-id="technology-table" empty-message="Aucune technologie renseignée.">
    <template #body-FinDeVie="{ data }">
      <DsfrBadge v-if="data.isEol" type="error" label="Fin de vie" small :data-testid="`technology-eol-badge-${data.id}`"></DsfrBadge>
      <span v-else-if="data.FinDeVie" :title="`Fin de support prévue le ${data.FinDeVie}`">{{ data.FinDeVie }}</span>
      <template v-else>—</template>
    </template>

    <template #body-Actions="{ data }">
      <DsfrButton
        title="Modifier la technologie"
        aria-label="Modifier la technologie"
        tertiary
        size="sm"
        icon="fr-icon-edit-line"
        :disabled="!canEdit"
        data-testid="technology-edit-btn"
        @click="
          (e) => {
            rememberTrigger(e);
            data.Actions.edit();
          }
        "
      >
        Modifier
      </DsfrButton>
      <DsfrButton
        title="Supprimer la technologie"
        aria-label="Supprimer la technologie"
        tertiary
        size="sm"
        icon="fr-icon-delete-line"
        :disabled="!canEdit"
        data-testid="technology-delete-btn"
        @click="data.Actions.remove()"
      >
        Supprimer
      </DsfrButton>
    </template>
  </RefAppTable>

  <DsfrModal
    :opened="technologyModal.isModalOpen.value || technologyModal.isCreateModalOpen.value"
    :title="technologyModal.isCreateModalOpen.value ? 'Ajouter une technologie' : 'Modifier la technologie'"
    data-testid="technology-modal"
    @close="technologyModal.closeModal"
  >
    <TechnologyForm
      :initial-data="technologyModal.selectedItem.value ?? undefined"
      :is-submitting="loading"
      data-testid="technology-form-container"
      @submit="handleSave"
      @cancel="technologyModal.closeModal"
    ></TechnologyForm>
  </DsfrModal>

  <DeleteConfirmationModal
    :opened="showDeleteConfirmation"
    item-name="cette technologie"
    data-testid="technology-delete-modal"
    @confirm="confirmDelete"
    @cancel="cancelDelete"
  ></DeleteConfirmationModal>
</template>
