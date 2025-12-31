<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { ApplicationWithPerms } from "@/models/Application";
import type { ApplicationStatusDto } from "@/client/types.gen";
import api from "@/api/index";
import { statusApplicationDictionary } from "@/composables/use-dictionary";
import { formatDateFR } from "@/composables/use-date";
import { useToasterStore } from "@/stores/toasterStore";
import { useUserStore } from "@/stores/userStore";
import { AdminLevel } from "@/models/user";
import useModal from "@/composables/use-modal";
import AppLoader from "./AppLoader.vue";
import StatusForm from "./form/StatusForm.vue";
import { useBreakpoints } from "@/composables/use-breakpoint";
import { BREAKPOINTS } from "@/constants/breakpoint";
import { useApplicationStore } from "@/stores/applicationStore";

interface StatusFormData {
  status: ApplicationStatusDto["status"];
  statusDate?: string;
}

const props = defineProps<{
  application: ApplicationWithPerms;
}>();

const toaster = useToasterStore();
const userStore = useUserStore();
const applicationStore = useApplicationStore();

const formModal = useModal();
const deleteModal = useModal();

const selectedStatus = computed<ApplicationStatusDto | null>(() => formModal.selectedItem.value as ApplicationStatusDto | null);
const statusPendingDeletion = computed<ApplicationStatusDto | null>(() => deleteModal.selectedItem.value as ApplicationStatusDto | null);

const statuses = ref<ApplicationStatusDto[]>([]);
const isLoading = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref("");

const canEdit = computed(() => userStore.adminLevel >= AdminLevel.WRITE || props.application.myPerms.has("writeBase"));
const deleteModalActions = computed(() => [
  {
    label: "Annuler",
    secondary: true,
    onClick: deleteModal.closeModal,
  },
  {
    label: isSubmitting.value ? "Suppression..." : "Supprimer",
    onClick: deleteStatus,
    disabled: isSubmitting.value,
  },
]);

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

const headers = computed(() => {
  const baseHeaders: string[] = ["Statut", "Date du statut"];

  if (canEdit.value) {
    baseHeaders.push("Actions");
  }

  return baseHeaders;
});

const rows = computed(() =>
  statuses.value.map((status) => {
    const row: Record<string, unknown> = {
      id: status.id,
      Statut: getStatusLabel(status),
      "Date du statut": formatStatusDateDisplay(status.statusDate),
    };

    if (canEdit.value) {
      row.Actions = status;
    }

    return row;
  }),
);

function getStatusLabel(status: ApplicationStatusDto): string {
  return (statusApplicationDictionary as Record<string, string>)[status.status] ?? status.status;
}

function formatStatusDateDisplay(statusDate: string | Date): string {
  return formatDateFR(statusDate);
}

function getStatusCardButtons(status: ApplicationStatusDto) {
  return [
    {
      label: "Modifier",
      icon: "ri-edit-line",
      tertiary: true,
      size: "sm" as const,
      disabled: !canEdit.value,
      "data-testid": "status-card-edit-btn",
      onClick: (event: MouseEvent) => {
        event.stopPropagation();
        if (!canEdit.value) {
          return;
        }

        openEditModal(status);
      },
    },
    {
      label: "Supprimer",
      icon: "ri-delete-bin-line",
      tertiary: true,
      size: "sm" as const,
      disabled: !canEdit.value,
      title: "Supprimer ce statut",
      "data-testid": "status-card-delete-btn",
      onClick: (event: MouseEvent) => {
        event.stopPropagation();
        if (!canEdit.value) {
          return;
        }

        openDeleteModal(status);
      },
    },
  ];
}

async function handleFormSubmit(formData: StatusFormData) {
  const isEdit = !!selectedStatus.value;
  if (isEdit) {
    await updateStatus(formData);
  } else {
    await createStatus(formData);
  }
}

async function createStatus(formData: StatusFormData) {
  try {
    isSubmitting.value = true;
    const payload = buildStatusPayload(formData);

    const response = await api.statusesControllerCreate({
      path: { applicationId: props.application.id },
      body: payload,
    });
    if (response.response.ok) {
      toaster.addSuccessMessage("Statut créé avec succès");
      formModal.closeModal();
      await fetchStatuses();
      await applicationStore.fetchApplication(props.application.id);
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
  formModal.openModal(status);
}

async function updateStatus(formData: StatusFormData) {
  const currentStatus = selectedStatus.value;
  if (!currentStatus) return;

  try {
    isSubmitting.value = true;
    const payload = buildStatusPayload(formData);

    const response = await api.statusesControllerUpdate({
      path: {
        applicationId: props.application.id,
        statusId: currentStatus.id,
      },
      body: payload,
    });

    if (response.response.ok) {
      toaster.addSuccessMessage("Statut modifié avec succès");
      formModal.closeModal();
      await fetchStatuses();
      await applicationStore.fetchApplication(props.application.id);
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
  deleteModal.openModal(status);
}

async function deleteStatus() {
  const statusToDelete = statusPendingDeletion.value;
  if (!statusToDelete) return;

  try {
    isSubmitting.value = true;
    const response = await api.statusesControllerDelete({
      path: {
        applicationId: props.application.id,
        statusId: statusToDelete.id,
      },
    });

    if (response.response.ok) {
      toaster.addSuccessMessage("Statut supprimé avec succès");
      deleteModal.closeModal();
      await fetchStatuses();
      await applicationStore.fetchApplication(props.application.id);
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

function buildStatusPayload(formData: StatusFormData) {
  const payload: { status: ApplicationStatusDto["status"]; statusDate?: Date } = {
    status: formData.status,
  };

  if (formData.statusDate) {
    payload.statusDate = new Date(formData.statusDate);
  }

  return payload;
}

const { smaller } = useBreakpoints({ mobile: BREAKPOINTS.MOBILE_MAX }, "max");
const isMobile = smaller("mobile");

onMounted(() => {
  fetchStatuses();
});
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w" data-testid="statuses-header">
    <div class="fr-col">
      <h3 class="fr-mb-0">Historique des statuts</h3>
    </div>
    <div v-if="canEdit" class="fr-col-auto">
      <DsfrButton
        icon="ri-add-line"
        data-testid="add-status-btn"
        title="Ajouter un nouveau statut"
        aria-label="Ajouter un nouveau statut"
        @click="formModal.openCreateModal()"
      >
        Ajouter un statut
      </DsfrButton>
    </div>
  </div>

  <DsfrModal
    :opened="formModal.isCreateModalOpen.value || formModal.isModalOpen.value"
    :title="formModal.isCreateModalOpen.value ? 'Ajouter un statut' : 'Modifier un statut'"
    data-testid="status-form-modal"
    @close="formModal.closeModal"
  >
    <StatusForm
      v-if="formModal.isCreateModalOpen.value || formModal.isModalOpen.value"
      :is-submitting="isSubmitting"
      :initial-data="selectedStatus ? { status: selectedStatus.status, statusDate: selectedStatus.statusDate ?? undefined } : undefined"
      data-testid="status-form"
      @submit="handleFormSubmit"
      @cancel="formModal.closeModal"
    ></StatusForm>
  </DsfrModal>

  <DsfrModal
    :opened="deleteModal.isModalOpen.value"
    title="Supprimer un statut"
    :actions="deleteModalActions"
    data-testid="delete-status-modal"
    @close="deleteModal.closeModal"
  >
    <p>Êtes-vous sûr de vouloir supprimer ce statut ?</p>
  </DsfrModal>

  <div v-if="errorMessage" class="fr-alert fr-alert--error" data-testid="statuses-error">
    <p>{{ errorMessage }}</p>
  </div>

  <div v-else-if="!isLoading && statuses.length === 0" class="text-center" data-testid="statuses-empty">
    <p>Aucun statut enregistré.</p>
  </div>

  <div v-else>
    <AppLoader v-if="isLoading" data-testid="statuses-loader"></AppLoader>
    <div v-else>
      <template v-if="!isMobile">
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
            <template v-if="typeof colKey === 'string' && colKey === 'Actions'">
              <div class="fr-btns-group fr-btns-group--inline-sm">
                <DsfrButton
                  size="sm"
                  tertiary
                  icon="ri-edit-line"
                  :disabled="!canEdit"
                  data-testid="status-edit-btn"
                  title="Modifier le statut"
                  aria-label="Modifier le statut"
                  @click="() => openEditModal(cell as ApplicationStatusDto)"
                >
                  Modifier
                </DsfrButton>
                <DsfrButton
                  size="sm"
                  tertiary
                  icon="ri-delete-bin-line"
                  :disabled="!canEdit"
                  title="Supprimer ce statut"
                  aria-label="Supprimer ce statut"
                  data-testid="status-delete-btn"
                  @click="() => openDeleteModal(cell as ApplicationStatusDto)"
                >
                  Supprimer
                </DsfrButton>
              </div>
            </template>
            <template v-else>
              {{ cell }}
            </template>
          </template>
        </DsfrDataTable>
      </template>

      <template v-else>
        <div class="status-card-list" data-testid="statuses-cards">
          <DsfrCard
            v-for="status in statuses"
            :key="status.id"
            :title="getStatusLabel(status)"
            :description="`Date du statut : ${formatStatusDateDisplay(status.statusDate!)}`"
            :buttons="getStatusCardButtons(status)"
            size="sm"
            :no-arrow="true"
            :title-link-attrs="{}"
            data-testid="status-card"
          ></DsfrCard>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.status-card-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
