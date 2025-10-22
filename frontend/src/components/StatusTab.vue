<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { ApplicationWithPerms } from "@/models/Application";
import type { ApplicationStatusDto } from "@/client/types.gen";
import api from "@/api/index";
import { statusApplicationDictionary } from "@/composables/use-dictionary";
import { useToasterStore } from "@/stores/toasterStore";
import { useUserStore } from "@/stores/userStore";
import { AdminLevel } from "@/models/user";
import useModal from "@/composables/use-modal";
import AppLoader from "./AppLoader.vue";
import StatusForm from "./form/StatusForm.vue";

interface StatusFormData {
  status: string
  statusDate?: string | null
}

// Interface for the current status in edit/delete modals
interface CurrentStatusData {
  id: string
  rawStatus: any // Use any since the form expects the raw ApplicationStatus enum
  rawStatusDate?: string | Date | null
}

const props = defineProps<{
  application: ApplicationWithPerms
}>();

const emit = defineEmits(["update:application"]);
const toaster = useToasterStore();
const userStore = useUserStore();
const statusModal = useModal();
const editStatusModal = useModal();
const deleteStatusModal = useModal();

const statuses = ref<ApplicationStatusDto[]>([]);
const isLoading = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref("");
const currentStatus = ref<CurrentStatusData | null>(null);
const canEdit = computed(() => userStore.adminLevel >= AdminLevel.WRITE || props.application.myPerms.has("writeBase"));

async function fetchStatuses() {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const response = await api.statusesControllerFind({
      path: { applicationId: props.application.id },
    });
    if (response.response.ok && response.data) {
      statuses.value = Array.isArray(response.data) ? response.data : [];
    } else {
      statuses.value = [];
      throw new Error("Failed to fetch statuses");
    }
  } catch (error) {
    console.error("Error fetching statuses:", error);
    errorMessage.value = "Erreur lors du chargement de l'historique des statuts.";
  } finally {
    isLoading.value = false;
  }
}

const isOnlyStatus = computed(() => statuses.value.length === 1);

const headers = computed(() => {
  const baseHeaders = [
    { key: "status", label: "Statut" },
    { key: "statusDate", label: "Date du statut" },
    { key: "createdAt", label: "Date de création" },
  ];

  if (canEdit.value) {
    baseHeaders.push({ key: "actions", label: "Actions" });
  }

  return baseHeaders;
});

const rows = computed(() =>
  statuses.value.map(status => ({
    id: status.id,
    status: (statusApplicationDictionary as any)[status.status] || status.status,
    statusDate: status.statusDate ? new Date(status.statusDate).toLocaleDateString("fr-FR") : "-",
    createdAt: new Date(status.createdAt).toLocaleDateString("fr-FR"),
    actions: status, // Pass the full status object for actions
  })),
);

async function createStatus(formData: StatusFormData) {
  try {
    isSubmitting.value = true;
    const payload = {
      status: formData.status,
      statusDate: formData.statusDate ? new Date(formData.statusDate) : null,
    };

    const response = await api.statusesControllerCreate({
      path: { applicationId: props.application.id },
      body: payload,
    });
    if (response.response.ok) {
      toaster.addSuccessMessage("Statut créé avec succès");
      statusModal.closeModal();
      emit("update:application", props.application);
      await fetchStatuses();
    } else {
      throw new Error("Failed to create status");
    }
  } catch (error) {
    console.error("Error creating status:", error);
    toaster.addErrorMessage("Erreur lors de la création du statut");
  } finally {
    isSubmitting.value = false;
  }
}

function openEditModal(status: ApplicationStatusDto) {
  currentStatus.value = {
    id: status.id,
    rawStatus: status.status,
    rawStatusDate: status.statusDate,
  };
  editStatusModal.openCreateModal();
}

async function updateStatus(formData: StatusFormData) {
  if (!currentStatus.value)
    return;

  try {
    isSubmitting.value = true;
    const payload = {
      status: formData.status,
      statusDate: formData.statusDate ? new Date(formData.statusDate) : null,
    };

    const response = await api.statusesControllerUpdate({
      path: {
        applicationId: props.application.id,
        statusId: currentStatus.value.id,
      },
      body: payload,
    });

    if (response.response.ok) {
      toaster.addSuccessMessage("Statut modifié avec succès");
      editStatusModal.closeModal();
      emit("update:application", props.application);
      await fetchStatuses();
    } else {
      throw new Error("Failed to update status");
    }
  } catch (error) {
    console.error("Error updating status:", error);
    toaster.addErrorMessage("Erreur lors de la modification du statut");
  } finally {
    isSubmitting.value = false;
  }
}

function openDeleteModal(status: ApplicationStatusDto) {
  // Prevent deletion if it's the only status
  if (isOnlyStatus.value) {
    toaster.addErrorMessage("Impossible de supprimer le dernier statut de l'application");
    return;
  }

  currentStatus.value = {
    id: status.id,
    rawStatus: status.status,
    rawStatusDate: status.statusDate,
  };
  deleteStatusModal.openCreateModal();
}

async function deleteStatus() {
  if (!currentStatus.value)
    return;

  try {
    isSubmitting.value = true;
    const response = await api.statusesControllerDelete({
      path: {
        applicationId: props.application.id,
        statusId: currentStatus.value.id,
      },
    });

    if (response.response.ok) {
      toaster.addSuccessMessage("Statut supprimé avec succès");
      deleteStatusModal.closeModal();
      emit("update:application", props.application);
      await fetchStatuses();
    } else {
      throw new Error("Failed to delete status");
    }
  } catch (error) {
    console.error("Error deleting status:", error);
    toaster.addErrorMessage("Erreur lors de la suppression du statut");
  } finally {
    isSubmitting.value = false;
  }
}
onMounted(() => {
  fetchStatuses();
});
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w" data-testid="statuses-header">
    <div class="fr-col">
      <h3 class="fr-mb-0">
        Historique des statuts
      </h3>
    </div>
    <div v-if="canEdit" class="fr-col-auto">
      <DsfrButton
        icon="ri-add-line"
        data-testid="add-status-btn"
        @click="statusModal.openCreateModal()"
      >
        Ajouter un statut
      </DsfrButton>
    </div>
  </div>

  <DsfrModal
    :opened="statusModal.isCreateModalOpen.value"
    title="Ajouter un statut"
    data-testid="status-modal"
    @close="statusModal.closeModal"
  >
    <StatusForm
      :is-submitting="isSubmitting"
      data-testid="status-form-modal"
      @submit="createStatus"
      @cancel="statusModal.closeModal"
    />
  </DsfrModal>

  <DsfrModal
    :opened="editStatusModal.isCreateModalOpen.value"
    title="Modifier un statut"
    data-testid="edit-status-modal"
    @close="editStatusModal.closeModal"
  >
    <StatusForm
      v-if="currentStatus"
      :is-submitting="isSubmitting"
      :initial-data="{ status: currentStatus.rawStatus, statusDate: currentStatus.rawStatusDate }"
      data-testid="edit-status-form-modal"
      @submit="updateStatus"
      @cancel="editStatusModal.closeModal"
    />
  </DsfrModal>

  <DsfrModal
    :opened="deleteStatusModal.isCreateModalOpen.value"
    title="Supprimer un statut"
    data-testid="delete-status-modal"
    @close="deleteStatusModal.closeModal"
  >
    <p>Êtes-vous sûr de vouloir supprimer ce statut ?</p>
    <div class="fr-modal__footer">
      <DsfrButtonGroup
        :inline-layout-when="true"
        :reverse="true"
        :buttons="[
          {
            label: 'Annuler',
            secondary: true,
            onClick: deleteStatusModal.closeModal,
          },
          {
            label: 'Supprimer',
            onClick: deleteStatus,
            disabled: isSubmitting,
          },
        ]"
      />
    </div>
  </DsfrModal>

  <div v-if="errorMessage" class="fr-alert fr-alert--error" data-testid="statuses-error">
    <p>{{ errorMessage }}</p>
  </div>

  <div v-else-if="!isLoading && statuses.length === 0" class="text-center" data-testid="statuses-empty">
    <p>Aucun statut enregistré.</p>
  </div>

  <div v-else>
    <AppLoader v-if="isLoading" data-testid="statuses-loader" />
    <div v-else>
      <DsfrDataTable
        :headers-row="headers"
        :rows="rows"
        row-key="id"
        :pagination="false"
        no-caption
        title="Historique des statuts"
        data-testid="statuses-table"
      >
        <template #cell="{ colKey, cell }">
          <template v-if="colKey === 'actions'">
            <DsfrButtonGroup
              :inline-layout-when="true"
              :buttons="[
                {
                  label: 'Modifier',
                  iconOnly: true,
                  icon: 'ri-edit-line',
                  size: 'sm',
                  tertiary: true,
                  disabled: !canEdit,
                  onClick: () => openEditModal(cell),
                },
                {
                  label: 'Supprimer',
                  iconOnly: true,
                  icon: 'ri-delete-bin-line',
                  size: 'sm',
                  tertiary: true,
                  disabled: !canEdit || isOnlyStatus,
                  title: isOnlyStatus ? 'Impossible de supprimer le dernier statut' : 'Supprimer ce statut',
                  onClick: () => openDeleteModal(cell),
                },
              ]"
            />
          </template>
          <template v-else>
            {{ cell }}
          </template>
        </template>
      </DsfrDataTable>
    </div>
  </div>
</template>
