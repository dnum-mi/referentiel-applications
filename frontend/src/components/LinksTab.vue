<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { ApplicationWithPerms } from "@/models/Application";
import type { CreateLinkDto, UpdateLinkDto, Link } from "@/client/types.gen";
import { useLinkStore } from "@/stores/linkStore";
import useModal from "@/composables/use-modal";
import LinkForm from "./form/LinkForm.vue";
import { linkTypesDict } from "@/composables/use-dictionary";
import { useUserStore } from "@/stores/userStore";
import { AdminLevel } from "@/models/user";
import { useToasterStore } from "@/stores/toasterStore.js";
import RefAppTable from "./RefAppTable.vue";
import type { TableColumn } from "@/types/table";

const props = withDefaults(
  defineProps<{
    application: ApplicationWithPerms;
    isMobile?: boolean;
  }>(),
  {
    isMobile: false,
  },
);

const linkStore = useLinkStore();
const userStore = useUserStore();
const linkModal = useModal<Link>();
const toaster = useToasterStore();

const selectedLinkIds = ref<string[]>([]);
const showDeleteConfirmation = ref(false);
const isSubmitting = ref(false);
const canEdit = computed(() => userStore.adminLevel >= AdminLevel.WRITE || props.application.myPerms.has("writeLinks"));

const currentPage = ref(0);
const pageSize = ref(15);
const firstIndex = computed(() => currentPage.value * pageSize.value);

const errorMessage = ref("");

const getTypeLabel = (type: string) => (linkTypesDict as Record<string, string>)[type] || "Type inconnu";

const tableColumns: TableColumn[] = [
  { field: "selection", header: "Sélection", sortable: false },
  { field: "lien", header: "Lien", sortable: false },
  { field: "description", header: "Description", sortable: false },
  { field: "typeDeLien", header: "Type de lien", sortable: false },
  { field: "actions", header: "Actions", sortable: false },
];

watch(
  () => props.isMobile,
  (isMobile) => {
    if (isMobile) selectedLinkIds.value = [];
  },
);

function onPage(event: any) {
  currentPage.value = event.page;
  pageSize.value = event.rows;
  linkStore.fetchLinks(props.application.id, {
    page: currentPage.value,
    pageSize: pageSize.value,
  });
}

watch([currentPage, pageSize], () => {
  linkStore.fetchLinks(props.application.id, {
    page: currentPage.value,
    pageSize: pageSize.value,
  });
});

// Amélioration 1 : Remplacer 'rows' par un tableau d'objets avec noms de champs normalisés
const rows = computed(() =>
  linkStore.links.map((link) => ({
    id: link.id,
    selection: link.id, // Utilisé pour le v-model de checkboxes
    lien: { label: link.link || "Lien vide", to: link.link },
    description: link.description || "Description vide",
    typeDeLien: getTypeLabel(link.type),
    actions: {
      edit: () => linkModal.openModal(link), // Action pour le bouton
    },
  })),
);

async function createLink(newLink: CreateLinkDto) {
  try {
    isSubmitting.value = true;
    await linkStore.createLink(props.application.id, newLink);
    linkModal.closeModal();
    // Amélioration 3 : 'emit' supprimé
    await linkStore.fetchLinks(props.application.id, { page: currentPage.value, pageSize: pageSize.value });
  } finally {
    isSubmitting.value = false;
  }
}

async function editLink(updatedLink: UpdateLinkDto) {
  try {
    isSubmitting.value = true;
    // Amélioration 2 : 'selectedItem' est maintenant typé
    const selectedItem = linkModal.selectedItem.value;
    if (!selectedItem?.id) {
      throw new Error("Aucun élément sélectionné pour la modification.");
    }

    await linkStore.updateLink(props.application.id, {
      id: selectedItem.id,
      ...updatedLink,
    });
    linkModal.closeModal();
    // Amélioration 3 : 'emit' supprimé
    await linkStore.fetchLinks(props.application.id, { page: currentPage.value, pageSize: pageSize.value });
  } finally {
    isSubmitting.value = false;
  }
}

async function confirmDelete() {
  if (!selectedLinkIds.value.length) {
    showDeleteConfirmation.value = false;
    return;
  }

  try {
    isSubmitting.value = true;
    await linkStore.deleteLinks(props.application.id, selectedLinkIds.value);
    selectedLinkIds.value = [];
    showDeleteConfirmation.value = false;
    await linkStore.fetchLinks(props.application.id, { page: currentPage.value, pageSize: pageSize.value });

    // Cette logique de pagination est parfaite, on n'y touche pas
    if (linkStore.links.length === 0 && (linkStore.total ?? 0) > 0 && currentPage.value > 0) {
      currentPage.value = Math.max(0, currentPage.value - 1);
      await linkStore.fetchLinks(props.application.id, { page: currentPage.value, pageSize: pageSize.value });
    }
  } catch (err) {
    toaster.addErrorMessage("Erreur lors de la suppression.");
    console.error("confirmDelete error:", err);
  } finally {
    isSubmitting.value = false;
  }
}

function removeSelectedLinks() {
  if (!selectedLinkIds.value.length) {
    errorMessage.value = "Aucune sélection.";
    return;
  }
  showDeleteConfirmation.value = true;
}

// Cette fonction est bien écrite et correspond au style des autres composants.
function getCardButtons(link: Link) {
  // On peut utiliser le type Link ici
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
        selectedLinkIds.value = [link.id];
        showDeleteConfirmation.value = true;
      },
    },
  ];
}
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w" data-testid="links-header">
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

  <div v-if="!linkStore.isLoading && linkStore.links.length === 0" class="text-center" data-testid="links-empty">
    <p>Aucun lien enregistré.</p>
  </div>

  <div v-else>
    <AppLoader v-if="linkStore.isLoading" data-testid="links-loader" />

    <div v-else>
      <template v-if="!props.isMobile">
        <div class="global-delete" style="margin-bottom: 1rem">
          <DsfrButton
            type="button"
            secondary
            icon="fr-icon-delete-line"
            data-testid="link-delete-selected-btn"
            :disabled="!selectedLinkIds.length || !canEdit"
            :title="!selectedLinkIds.length ? 'Sélectionnez des éléments pour activer' : 'Supprimer la sélection'"
            :aria-label="
              !selectedLinkIds.length ? 'Supprimer la sélection (désactivé, aucun élément sélectionné)' : 'Supprimer la sélection'
            "
            @click="removeSelectedLinks"
          >
            Supprimer la sélection
          </DsfrButton>

          <div class="sr-only" aria-live="polite" aria-atomic="true">
            {{ selectedLinkIds.length > 0 ? `${selectedLinkIds.length} élément(s) sélectionné(s)` : "" }}
          </div>
        </div>

        <RefAppTable
          :items="rows"
          :columns="tableColumns"
          :paginator="true"
          :lazy="true"
          :rows="pageSize"
          :first="firstIndex"
          :total-records="linkStore.total"
          data-testid="links-table"
          @page="onPage"
        >
          <template #body-selection="{ data }">
            <input v-model="selectedLinkIds" type="checkbox" :aria-label="`Sélectionner lien ${data.selection}`" :value="data.selection" />
          </template>

          <template #body-lien="{ data }">
            <a :href="data.lien.to" target="_blank" rel="noopener noreferrer" data-testid="link-item">{{ data.lien.label }}</a>
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
          </template>
        </RefAppTable>
      </template>

      <div v-else class="link-card-list">
        <DsfrCard
          v-for="link in linkStore.links"
          :key="link.id"
          :title="link.description || 'Description vide'"
          :description="link.link"
          :link="link.link"
          :buttons="getCardButtons(link)"
          size="sm"
          :noArrow="true"
          class="fr-mb-2w"
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
    <DsfrAlert
      v-show="errorMessage.length > 0"
      class="mb-4"
      tabindex="-1"
      type="error"
      role="alert"
      aria-live="assertive"
      title="Une erreur est survenue"
      :description="errorMessage"
    />
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
    item-name="liens"
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

.fr-mb-2w {
  margin-bottom: 1rem;
}

.sr-only {
  position: absolute !important;
  height: 1px;
  width: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap;
  border: 0;
  padding: 0;
  margin: -1px;
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
