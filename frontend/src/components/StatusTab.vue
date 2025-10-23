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
import { useBreakpoints } from "@/composables/use-breakpoint";
import { BREAKPOINTS } from "@/constants/breakpoint";

interface StatusFormData {
  status: string
  statusDate?: string | null
}

const props = defineProps<{
  application: ApplicationWithPerms
}>();


const toaster = useToasterStore();
const userStore = useUserStore();


const formModal = useModal<ApplicationStatusDto>();
const deleteModal = useModal<ApplicationStatusDto>();

const statuses = ref<ApplicationStatusDto[]>([]);
const isLoading = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref("");

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
    baseHeaders.push({ key: "actions", label: "Actions", sortable: false });
  }

  return baseHeaders;
});

const rows = computed(() =>
  statuses.value.map(status => ({
    id: status.id,
    status: (statusApplicationDictionary as Record<string, string>)[status.status] || status.status,
    statusDate: status.statusDate ? new Date(status.statusDate).toLocaleDateString("fr-FR") : "-",
    createdAt: new Date(status.createdAt).toLocaleDateString("fr-FR"),
    actions: status, 
  })),
);

async function handleFormSubmit(formData: StatusFormData) {
  const isEdit = !!formModal.selectedItem.value;
  if (isEdit) {
    await updateStatus(formData);
  } else {
    await createStatus(formData);
  }
}

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
      formModal.closeModal();
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
  formModal.openModal(status);
}

async function updateStatus(formData: StatusFormData) {
  if (!formModal.selectedItem.value) return;

  try {
    isSubmitting.value = true;
    const payload = {
      status: formData.status,
      statusDate: formData.statusDate ? new Date(formData.statusDate) : null,
    };

    const response = await api.statusesControllerUpdate({
      path: {
        applicationId: props.application.id,
        statusId: formModal.selectedItem.value.id,
      },
      body: payload,
    });

    if (response.response.ok) {
      toaster.addSuccessMessage("Statut modifié avec succès");
      formModal.closeModal();
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
  if (isOnlyStatus.value) {
    toaster.addErrorMessage("Impossible de supprimer le dernier statut de l'application");
    return;
  }
  deleteModal.openModal(status);
}

async function deleteStatus() {
  if (!deleteModal.selectedItem.value) return;

  try {
    isSubmitting.value = true;
    const response = await api.statusesControllerDelete({
      path: {
        applicationId: props.application.id,
        statusId: deleteModal.selectedItem.value.id,
      },
    });

    if (response.response.ok) {
      toaster.addSuccessMessage("Statut supprimé avec succès");
      deleteModal.closeModal();
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


const { smaller } = useBreakpoints({ mobile: BREAKPOINTS.MOBILE_MAX }, "max");
const isMobile = smaller("mobile");

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
      :initial-data="formModal.selectedItem.value ? { status: formModal.selectedItem.value.status, statusDate: formModal.selectedItem.value.statusDate } : undefined"
      data-testid="status-form"
      @submit="handleFormSubmit"
      @cancel="formModal.closeModal"
    ></StatusForm>
  </DsfrModal>

  <DsfrModal
    :opened="deleteModal.isModalOpen.value"
    title="Supprimer un statut"
    data-testid="delete-status-modal"
    @close="deleteModal.closeModal"
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
            onClick: deleteModal.closeModal,
          },
          {
            label: 'Supprimer',
            onClick: deleteStatus,
            disabled: isSubmitting,
          },
        ]"
      ></DsfrButtonGroup>
    </div>
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
          <template #cell(actions)="{ cell }">
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
            ></DsfrButtonGroup>
          </template>
        </DsfrDataTable>
      </template>

      <template v-else>
        <div data-testid="statuses-cards">
          <div v-for="status in statuses" :key="status.id" class="fr-mb-2w">
            <DsfrCard
              :title="(statusApplicationDictionary as Record<string, string>)[status.status] || status.status"
              :description="`Créé le: ${new Date(status.createdAt).toLocaleDateString('fr-FR')}`"
              :detail="status.statusDate ? `Date du statut: ${new Date(status.statusDate).toLocaleDateString('fr-FR')}` : 'Date du statut: -'"
              :size="'sm'"
              :buttons="[
                {
                  label: 'Modifier',
                  iconOnly: true,
                  icon: 'ri-edit-line',
                  size: 'sm',
                  tertiary: true,
                  disabled: !canEdit,
                  onClick: () => openEditModal(status),
                },
                {
                  label: 'Supprimer',
                  iconOnly: true,
                  icon: 'ri-delete-bin-line',
                  size: 'sm',
                  tertiary: true,
                  disabled: !canEdit || isOnlyStatus,
                  title: isOnlyStatus ? 'Impossible de supprimer le dernier statut' : 'Supprimer ce statut',
                  onClick: () => openDeleteModal(status),
                },
              ]"
              data-testid="status-card"
            ></DsfrCard>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>