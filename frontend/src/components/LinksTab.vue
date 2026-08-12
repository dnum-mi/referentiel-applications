<script setup lang="ts">
import { Permission, type CreateLinkDto, type LinkDto, type UpdateLinkDto } from "@/client/types.gen";
import { linkTypesDict } from "@/constants/dictionary";
import useModal from "@/composables/use-modal";
import type { ApplicationWithPerms } from "@/models/Application";
import api from "@/api/index.js";
import { useToasterStore } from "@/stores/toasterStore.js";
import type { TableColumn } from "@/types/table";
import type { DsfrButtonProps } from "@gouvminint/vue-dsfr";
import { computed, onMounted, ref, type ButtonHTMLAttributes } from "vue";
import LinkForm from "./form/LinkForm.vue";
import RefAppTable from "./RefAppTable.vue";
import { useAppPermission } from "@/composables/use-app-permission";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    application: ApplicationWithPerms;
    isMobile?: boolean;
  }>(),
  {
    isMobile: false,
  },
);

const linkModal = useModal<LinkDto>();
const links = ref<LinkDto[]>([]);
const total = ref(0);
const isLoading = ref(false);
const toaster = useToasterStore();

const isSubmitting = ref(false);
const linkToDelete = ref<string | null>(null);
const showDeleteConfirmation = ref(false);
const canEdit = useAppPermission(() => props.application.myPerms, [Permission.LINK_WRITE]);

const currentPage = ref(0);
const pageSize = ref(15);
const firstIndex = computed(() => currentPage.value * pageSize.value);

const getTypeLabel = (type: string) => (linkTypesDict as Record<string, string>)[type] || "Type inconnu";

const tableColumns: TableColumn[] = [
  { field: "lien", header: "Lien", sortable: false },
  { field: "description", header: "Description", sortable: false },
  { field: "typeDeLien", header: "Type de lien", sortable: false },
  { field: "actions", header: "Actions", sortable: false },
];

function onPage(event: any) {
  currentPage.value = event.page;
  pageSize.value = event.rows;
  fetchLinks({
    page: currentPage.value,
    pageSize: pageSize.value,
  });
}

async function fetchLinks(filters: { page?: number; pageSize?: number } = {}) {
  try {
    isLoading.value = true;
    const cleanParams = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined));
    const response = await api.applicationLinksControllerFindAll({
      path: { applicationId: props.application.id },
      query: cleanParams as any,
    });
    if (!response.response.ok) {
      throw new Error("Erreur lors de la récupération des liens.");
    }
    const responseData = response.data as any;
    links.value = responseData.results ?? [];
    total.value = responseData.total ?? 0;
  } catch {
    toaster.addErrorMessage("Erreur lors de la récupération des liens.");
    throw new Error("Erreur lors de la récupération des liens.");
  } finally {
    isLoading.value = false;
  }
}

const rows = computed(() =>
  links.value.map((link) => ({
    id: link.id,
    lien: { label: link.link || "Lien vide", to: link.link },
    description: link.description || "Description vide",
    typeDeLien: getTypeLabel(link.type),
    actions: {
      edit: () => linkModal.openModal(link),
    },
  })),
);

async function createLink(newLink: CreateLinkDto) {
  try {
    isSubmitting.value = true;
    const response = await api.applicationLinksControllerCreate({ path: { applicationId: props.application.id }, body: newLink });
    if (!response.response.ok || !response.data) {
      throw new Error("Erreur lors de la création du lien.");
    }
    toaster.addSuccessMessage("Lien créé avec succès !");
    linkModal.closeModal();
    await fetchLinks({ page: currentPage.value, pageSize: pageSize.value });
  } finally {
    isSubmitting.value = false;
  }
}

async function editLink(updatedLink: UpdateLinkDto) {
  try {
    isSubmitting.value = true;
    const selectedItem = linkModal.selectedItem.value as LinkDto | null;
    if (!selectedItem?.id) {
      throw new Error("Aucun élément sélectionné pour la modification.");
    }
    // Filter to only include update fields (link, type, description)
    const updateDto: UpdateLinkDto = {
      link: updatedLink.link,
      type: updatedLink.type,
      description: updatedLink.description,
    };
    const response = await api.applicationLinksControllerUpdate({
      path: { applicationId: props.application.id, id: selectedItem.id },
      body: updateDto,
    });
    if (!response.response.ok || !response.data) {
      throw new Error("Erreur lors de la modification du lien.");
    }
    toaster.addSuccessMessage("Lien modifié avec succès !");
    linkModal.closeModal();
    await fetchLinks({ page: currentPage.value, pageSize: pageSize.value });
  } finally {
    isSubmitting.value = false;
  }
}

async function confirmDelete() {
  if (!linkToDelete.value) {
    showDeleteConfirmation.value = false;
    return;
  }

  try {
    isSubmitting.value = true;
    await api.applicationLinksControllerDelete({
      path: { applicationId: props.application.id, id: linkToDelete.value },
    });
    toaster.addSuccessMessage("Lien supprimé avec succès !");
    linkToDelete.value = null;
    showDeleteConfirmation.value = false;
    await fetchLinks({ page: currentPage.value, pageSize: pageSize.value });

    if (links.value.length === 0 && total.value > 0 && currentPage.value > 0) {
      currentPage.value = Math.max(0, currentPage.value - 1);
      await fetchLinks({ page: currentPage.value, pageSize: pageSize.value });
    }
  } catch {
    toaster.addErrorMessage("Erreur lors de la suppression.");
  } finally {
    isSubmitting.value = false;
  }
}

function requestDelete(linkId: string) {
  linkToDelete.value = linkId;
  showDeleteConfirmation.value = true;
}

function getCardButtons(link: LinkDto): (DsfrButtonProps & ButtonHTMLAttributes)[] {
  return [
    {
      label: "Modifier",
      icon: "fr-icon-edit-line",
      tertiary: true,
      size: "sm",
      disabled: !canEdit.value,
      title: "Modifier le lien",
      onClick: (event?: Event) => {
        event?.stopPropagation();
        linkModal.openModal(link);
      },
    },
    {
      label: "Supprimer",
      icon: "fr-icon-delete-line",
      tertiary: true,
      size: "sm",
      disabled: !canEdit.value,
      title: "Supprimer le lien",
      onClick: (event?: Event) => {
        event?.stopPropagation();
        requestDelete(link.id);
      },
    },
  ];
}

onMounted(async () => {
  await fetchLinks({
    page: currentPage.value,
    pageSize: pageSize.value,
  });
});
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w" v-bind="$attrs" data-testid="links-header">
    <div class="fr-col">
      <h3 class="fr-mb-0">Gestion des liens</h3>
    </div>
    <div class="fr-col-auto">
      <DsfrButton
        class="fr-btn--icon-left fr-icon-add-line"
        data-testid="link-add-btn"
        :disabled="!canEdit"
        @click="linkModal.openCreateModal()"
      >
        Ajouter un lien
      </DsfrButton>
    </div>
  </div>

  <div v-if="!isLoading && links.length === 0" class="text-center" data-testid="links-empty">
    <p>Aucun lien enregistré.</p>
  </div>

  <div v-else>
    <AppLoader v-if="isLoading" data-testid="links-loader" />

    <div v-else>
      <template v-if="!props.isMobile">
        <RefAppTable
          :items="rows"
          :columns="tableColumns"
          :paginator="true"
          :lazy="true"
          :rows="pageSize"
          :first="firstIndex"
          :total-records="total"
          data-testid="links-table"
          @page="onPage"
        >
          <template #body-lien="{ data }">
            <a
              :href="data.lien.to"
              target="_blank"
              rel="noopener noreferrer"
              :title="`${data.lien.label} - nouvelle fenêtre`"
              data-testid="link-item"
              >{{ data.lien.label }}</a
            >
          </template>

          <template #body-typeDeLien="{ data }">
            <DsfrTag :label="data.typeDeLien" :title="data.typeDeLien" />
          </template>

          <template #body-actions="{ data }">
            <DsfrButton
              tertiary
              size="sm"
              icon="fr-icon-edit-line"
              :disabled="!canEdit"
              data-testid="link-edit-btn"
              title="Modifier le lien"
              aria-label="Modifier le lien"
              @click="data.actions.edit"
            >
              Modifier
            </DsfrButton>
            <DsfrButton
              tertiary
              size="sm"
              icon="fr-icon-delete-line"
              :disabled="!canEdit"
              data-testid="link-delete-btn"
              title="Supprimer le lien"
              aria-label="Supprimer le lien"
              @click="requestDelete(data.id)"
            >
              Supprimer
            </DsfrButton>
          </template>
        </RefAppTable>
      </template>

      <div v-else class="link-card-list">
        <DsfrCard
          v-for="link in links"
          :key="link.id"
          :title="link.description || 'Description vide'"
          :description="link.link"
          :link="link.link"
          :buttons="getCardButtons(link)"
          size="sm"
          :noArrow="true"
          data-testid="link-card"
        >
          <template #end-details>
            <DsfrTag :label="getTypeLabel(link.type)" :title="getTypeLabel(link.type)" />
          </template>
        </DsfrCard>
      </div>
    </div>
  </div>

  <DsfrModal
    :opened="linkModal.isModalOpen.value || linkModal.isCreateModalOpen.value"
    :title="linkModal.isCreateModalOpen.value ? 'Ajouter un lien' : 'Modifier le lien'"
    data-testid="link-modal"
    @close="linkModal.closeModal"
  >
    <LinkForm
      :initial-data="linkModal.selectedItem.value ?? undefined"
      :is-submitting="isSubmitting"
      data-testid="link-form"
      @submit="(formData) => (linkModal.selectedItem.value ? editLink(formData) : createLink(formData))"
      @cancel="linkModal.closeModal"
    />
  </DsfrModal>

  <DeleteConfirmationModal
    :opened="showDeleteConfirmation"
    item-name="le lien"
    data-testid="link-delete-modal"
    @confirm="confirmDelete"
    @cancel="() => (showDeleteConfirmation = false)"
  />
</template>

<style scoped>
.link-card-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.link-card-list ::v-deep(.fr-card__footer) {
  position: relative;
  z-index: 2;
}

.link-card-list ::v-deep(.fr-card__footer .fr-btn) {
  min-height: 32px;
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
}

.link-card-list ::v-deep(.fr-card__footer .fr-btn__icon),
.link-card-list ::v-deep(.fr-card__footer .fr-icon) {
  margin-right: 0.4rem;
  vertical-align: middle;
}
</style>
