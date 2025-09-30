<script setup lang="ts">
import { ref, computed, onMounted, defineProps, watch } from "vue";
import type { ApplicationWithPerms } from "@/models/Application";
import type { CreateLinkDto, UpdateLinkDto } from "@/client/types.gen";
import { useLinkStore } from "@/stores/linkStore";
import { useToasterStore } from "@/stores/toasterStore";
import useModal from "@/composables/use-modal";
import LinkForm from "./form/LinkForm.vue";
import PaginationFooter from "./PaginationFooter.vue";
import { linkTypesDict } from "@/composables/use-dictionary";
import { useUserStore } from "@/stores/userStore";
import { AdminLevel } from "@/models/user";

const props = defineProps<{
  application: ApplicationWithPerms
}>();

const emit = defineEmits(["update:application"]);
const toaster = useToasterStore();
const linkStore = useLinkStore();
const userStore = useUserStore();
const linkModal = useModal();

const selectedLinkIds = ref<string[]>([]);
const showDeleteConfirmation = ref(false);
const isSubmitting = ref(false);
const canEdit = computed(() => userStore.adminLevel >= AdminLevel.WRITE || props.application.myPerms.has("writeLinks"));

const currentPage = ref(0);
const pageSize = ref(10);

const formatLink = (url: string) => (!url.startsWith("http") ? `http://${url}` : url);
const getTypeLabel = (type: string) => (linkTypesDict as any)[type] || "Type inconnu";

// Computed properties for pagination
const pages = computed(() => {
  const totalPages = Math.ceil(linkStore.total / pageSize.value);
  return Array.from({ length: totalPages }).map((_, i) => ({
    label: String(i + 1),
    title: `Page ${i + 1}`,
    href: `#page-${i + 1}`,
  }));
});

// Watch for pagination changes
watch([currentPage, pageSize], () => {
  fetchLinks();
});

function fetchLinks() {
  linkStore.fetchLinks(props.application.id, {
    page: currentPage.value,
    pageSize: pageSize.value,
  });
}

onMounted(async () => {
  fetchLinks();
});

const rows = computed(() =>
  linkStore.links.map(link => [
    link.id,
    { label: link.link || "Lien vide", to: formatLink(link.link) },
    link.description || "Description vide",
    getTypeLabel(link.type),
    {
      component: "DsfrButton",
      label: "Modifier",
      onClick: () => linkModal.openModal(link),
    },
  ]),
);

async function createLink(newLink: CreateLinkDto) {
  try {
    isSubmitting.value = true;
    await linkStore.createLink(props.application.id, {
      ...newLink,
      link: formatLink(newLink.link),
    });
    linkModal.closeModal();
    emit("update:application", props.application);
    await fetchLinks();
  } finally {
    isSubmitting.value = false;
  }
}

async function editLink(updatedLink: UpdateLinkDto) {
  try {
    isSubmitting.value = true;
    const selectedItem = linkModal.selectedItem.value as any;
    if (!selectedItem?.id) {
      throw new Error("Aucun élément sélectionné pour la modification.");
    }

    await linkStore.updateLink(props.application.id, {
      ...updatedLink,
      id: selectedItem.id,
      link: updatedLink.link ? formatLink(updatedLink.link) : undefined,
    });
    linkModal.closeModal();
    emit("update:application", props.application);
    await fetchLinks();
  } finally {
    isSubmitting.value = false;
  }
}

async function confirmDelete() {
  await linkStore.deleteLinks(props.application.id, selectedLinkIds.value);
  selectedLinkIds.value = [];
  showDeleteConfirmation.value = false;
  emit("update:application", props.application);
  await fetchLinks();
  emit("update:application", props.application);
}

function removeSelectedLinks() {
  if (!selectedLinkIds.value.length) {
    toaster.addErrorMessage("Aucune sélection.");
    return;
  }
  showDeleteConfirmation.value = true;
}

// Pagination handlers
function handlePageChange(newPage: number) {
  currentPage.value = newPage;
}

function handlePageSizeChange(newPageSize: number) {
  pageSize.value = newPageSize;
  currentPage.value = 0;
}
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w" data-testid="links-header">
    <div class="fr-col">
      <h3 class="fr-mb-0">
        Gestion des liens
      </h3>
    </div>
    <div class="fr-col-auto">
      <DsfrButton class="fr-btn--icon-left fr-icon-add-line" data-testid="link-add-btn" :disabled="!canEdit" @click="linkModal.openCreateModal()">
        Ajouter un lien
      </DsfrButton>
    </div>
  </div>

  <div v-if="!linkStore.isLoading && rows.length === 0" class="text-center" data-testid="links-empty">
    <p>Aucun lien enregistré.</p>
  </div>

  <div v-else>
    <div class="global-delete">
      <DsfrButton
        type="button"
        tertiary
        icon="fr-icon-delete-line"
        data-testid="link-delete-selected-btn"
        :disabled="!selectedLinkIds.length || !canEdit"
        @click="removeSelectedLinks"
      >
        Supprimer la sélection
      </DsfrButton>
    </div>

    <AppLoader v-if="linkStore.isLoading" data-testid="links-loader" />

    <div v-else>
      <DsfrDataTable
        v-model:selection="selectedLinkIds"
        :headers-row="['Sélection', 'Lien', 'Description', 'Type de lien', 'Actions']"
        :rows="rows"
        row-key="id"
        :pagination="false"
        title="Liste des liens"
        data-testid="links-table"
      >
        <template #cell="{ colKey, cell }">
          <template v-if="colKey === 'Sélection'">
            <input v-model="selectedLinkIds" type="checkbox" :value="cell">
          </template>
          <template v-else-if="colKey === 'Lien'">
            <a :href="(cell as any).to" target="_blank" rel="noopener noreferrer" data-testid="link-item">{{ (cell as any).label }}</a>
          </template>
          <template v-else-if="colKey === 'Actions'">
            <DsfrButton tertiary size="sm" icon="fr-icon-edit-line" :disabled="!canEdit" data-testid="link-edit-btn" @click="(cell as any).onClick">
              {{ (cell as any).label }}
            </DsfrButton>
          </template>
          <template v-else>
            {{ cell }}
          </template>
        </template>
      </DsfrDataTable>

      <PaginationFooter
        :total-filtered="linkStore.total"
        :pages="pages"
        :limit="pageSize"
        :page="currentPage"
        data-testid="links-pagination-footer"
        @update:limit="handlePageSizeChange"
        @update:page="handlePageChange"
      />
    </div>
  </div>

  <!-- Modals -->
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
    item-name="liens"
    data-testid="link-delete-modal"
    @confirm="confirmDelete"
    @cancel="() => (showDeleteConfirmation = false)"
  />
</template>

<style scoped>
input[type="checkbox"] {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 2px solid var(--dsfr-border, #ccc);
  transition: all 0.3s ease;
}

.global-delete {
  margin-bottom: 1rem;
}
</style>
