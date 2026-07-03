<script setup lang="ts">
import api from "@/api/index";
import { type LicenseDto, Permission } from "@/client/types.gen";
import useModal from "@/composables/use-modal";
import type { APP_PERMISSIONS, Application } from "@/models/Application";
import { useToasterStore } from "@/stores/toasterStore";
import { useUserStore } from "@/stores/userStore";
import type { TableColumn } from "@/types/table";
import { computed, nextTick, onBeforeMount, ref } from "vue";
import RefAppTable from "../RefAppTable.vue";
import LicenseForm from "./LicenseForm.vue";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  application: Application & { myPerms: Set<APP_PERMISSIONS> };
  isMobile?: boolean;
}>();

const userStore = useUserStore();
const toaster = useToasterStore();
const licenseModal = useModal<LicenseDto>();

const licenses = ref<LicenseDto[]>([]);
const loading = ref(false);
const showDeleteConfirmation = ref(false);
const licenseToDelete = ref<LicenseDto | null>(null);
const statusMessage = ref("");
const lastTrigger = ref<HTMLElement | null>(null);

const canEdit = computed(() => userStore.hasPermissions([Permission.APP_WRITE], Array.from(props.application.myPerms)));

const columns: TableColumn[] = [
  { field: "Licence", header: "Licence", sortable: true },
  { field: "Version", header: "Version", sortable: true },
  { field: "Actions", header: "Actions", sortable: false },
];

const tableRows = computed(() =>
  licenses.value.map((license) => ({
    id: license.id,
    Licence: license.name,
    Version: license.version || "—",
    Actions: {
      edit: () => licenseModal.openModal(license),
      remove: () => askDelete(license),
    },
  })),
);

async function fetchLicenses(applicationId: string) {
  const response = await api.licenseControllerFindAll({ path: { applicationId } });
  licenses.value = response.data ?? [];
}

function rememberTrigger(event: Event) {
  lastTrigger.value = (event.currentTarget as HTMLElement) ?? null;
}

onBeforeMount(async () => {
  loading.value = true;
  try {
    await fetchLicenses(props.application.id);
  } finally {
    loading.value = false;
  }
});

async function handleSave(license: { id?: string; name: string; version?: string | null }) {
  loading.value = true;
  licenseModal.closeModal();
  try {
    if (license.id) {
      await api.licenseControllerUpdate({
        path: { applicationId: props.application.id, id: license.id },
        body: { name: license.name, version: license.version },
      });
    } else {
      await api.licenseControllerCreate({
        path: { applicationId: props.application.id },
        body: { name: license.name, version: license.version },
      });
    }
    await fetchLicenses(props.application.id);
    statusMessage.value = "Licence sauvegardée avec succès !";
    toaster.addSuccessMessage("Licence sauvegardée avec succès !");
    await nextTick();
    lastTrigger.value?.focus();
  } catch {
    toaster.addErrorMessage("Erreur lors de la sauvegarde de la licence.");
  } finally {
    loading.value = false;
  }
}

function askDelete(license: LicenseDto) {
  licenseToDelete.value = license;
  showDeleteConfirmation.value = true;
}

async function confirmDelete() {
  if (!licenseToDelete.value) return;
  try {
    await api.licenseControllerDelete({
      path: { applicationId: props.application.id, id: licenseToDelete.value.id },
    });
    await fetchLicenses(props.application.id);
    toaster.addSuccessMessage("Licence supprimée avec succès !");
  } catch {
    toaster.addErrorMessage("Erreur lors de la suppression de la licence.");
  } finally {
    showDeleteConfirmation.value = false;
    licenseToDelete.value = null;
  }
}

function cancelDelete() {
  showDeleteConfirmation.value = false;
  licenseToDelete.value = null;
}
</script>

<template>
  <p class="fr-sr-only" aria-live="polite" aria-atomic="true" data-testid="license-status">{{ statusMessage }}</p>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w" v-bind="$attrs" data-testid="license-tab">
    <div class="fr-col">
      <h3 class="fr-mb-0">Licences</h3>
    </div>
    <div class="fr-col-auto">
      <DsfrButton
        type="button"
        title="Ajouter une licence à l’application"
        aria-label="Ajouter une licence"
        class="fr-btn--icon-left fr-icon-add-line"
        :disabled="!canEdit"
        data-testid="license-add-btn"
        @click="
          (e) => {
            rememberTrigger(e);
            licenseModal.openCreateModal();
          }
        "
      >
        Ajouter une licence
      </DsfrButton>
    </div>
  </div>

  <AppLoader v-if="loading" data-testid="license-loader"></AppLoader>

  <div v-else-if="licenses.length === 0" class="text-center" data-testid="license-empty-state">
    <p>Aucune licence renseignée.</p>
  </div>

  <RefAppTable v-else :items="tableRows" :columns="columns" data-test-id="license-table" empty-message="Aucune licence renseignée.">
    <template #body-Actions="{ data }">
      <DsfrButton
        title="Modifier la licence"
        aria-label="Modifier la licence"
        tertiary
        size="sm"
        icon="fr-icon-edit-line"
        :disabled="!canEdit"
        data-testid="license-edit-btn"
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
        title="Supprimer la licence"
        aria-label="Supprimer la licence"
        tertiary
        size="sm"
        icon="fr-icon-delete-line"
        :disabled="!canEdit"
        data-testid="license-delete-btn"
        @click="data.Actions.remove()"
      >
        Supprimer
      </DsfrButton>
    </template>
  </RefAppTable>

  <DsfrModal
    :opened="licenseModal.isModalOpen.value || licenseModal.isCreateModalOpen.value"
    :title="licenseModal.isCreateModalOpen.value ? 'Ajouter une licence' : 'Modifier la licence'"
    data-testid="license-modal"
    @close="licenseModal.closeModal"
  >
    <LicenseForm
      :initial-data="licenseModal.selectedItem.value ?? undefined"
      :is-submitting="loading"
      data-testid="license-form-container"
      @submit="handleSave"
      @cancel="licenseModal.closeModal"
    ></LicenseForm>
  </DsfrModal>

  <DeleteConfirmationModal
    :opened="showDeleteConfirmation"
    item-name="cette licence"
    data-testid="license-delete-modal"
    @confirm="confirmDelete"
    @cancel="cancelDelete"
  ></DeleteConfirmationModal>
</template>
