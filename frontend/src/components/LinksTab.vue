<script setup lang="ts">
import { ref, computed, onMounted, defineProps } from "vue";
import type { ApplicationWithPerms, ExternalRessource } from "@/models/Application";
import { useLinkStore } from "@/stores/linkStore";
import useToaster from "@/composables/use-toaster";
import useModal from "@/composables/use-modal";
import LinkForm from "./form/LinkForm.vue";
import { linkTypesDict } from "@/composables/use-dictionary";
import { useUserStore } from "@/stores/userStore";
import { AdminLevel } from "@/models/user";

const props = defineProps<{
  application: ApplicationWithPerms
}>();

const emit = defineEmits(["update:application"]);
const toaster = useToaster();
const linkStore = useLinkStore();
const userStore = useUserStore();
const linkModal = useModal();

const selectedLinkIds = ref<string[]>([]);
const showDeleteConfirmation = ref(false);
const isSubmitting = ref(false);
const currentPage = ref(0);
const canEdit = computed(() => userStore.adminLevel >= AdminLevel.WRITE || props.application.myPerms.has("writeLinks"));

const formatLink = (url: string) => (!url.startsWith("http") ? `http://${url}` : url);
const getTypeLabel = (type: string) => linkTypesDict[type] || "Type inconnu";

onMounted(async () => {
  linkStore.fetchLinks(props.application.id);
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

async function createLink(newLink: ExternalRessource) {
  try {
    isSubmitting.value = true;
    await linkStore.createLink(props.application.id, {
      ...newLink,
      link: formatLink(newLink.link),
    });
    linkModal.closeModal();
    emit("update:application", props.application);
  } finally {
    isSubmitting.value = false;
  }
}

async function editLink(updatedLink: ExternalRessource) {
  try {
    isSubmitting.value = true;
    await linkStore.updateLink(props.application.id, {
      ...updatedLink,
      link: formatLink(updatedLink.link),
    });
    linkModal.closeModal();
    emit("update:application", props.application);
  } finally {
    isSubmitting.value = false;
  }
}

async function confirmDelete() {
  await linkStore.deleteLinks(props.application.id, selectedLinkIds.value);
  selectedLinkIds.value = [];
  showDeleteConfirmation.value = false;
  emit("update:application", props.application);
}

function removeSelectedLinks() {
  if (!selectedLinkIds.value.length) {
    toaster.addErrorMessage("Aucune sélection.");
    return;
  }
  showDeleteConfirmation.value = true;
}
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
    <div class="fr-col">
      <h3 class="fr-mb-0">
        Gestion des liens
      </h3>
    </div>
    <div class="fr-col-auto">
      <DsfrButton class="fr-btn--icon-left fr-icon-add-line" :disabled="!canEdit" @click="linkModal.openCreateModal()">
        Ajouter un lien
      </DsfrButton>
    </div>
  </div>

  <div v-if="!linkStore.isLoading && rows.length === 0" class="text-center">
    <p>Aucun lien enregistré.</p>
  </div>

  <div v-else>
    <div class="global-delete">
      <DsfrButton
        type="button"
        tertiary
        icon="fr-icon-delete-line"
        :disabled="!selectedLinkIds.length || !canEdit"
        @click="removeSelectedLinks"
      >
        Supprimer la sélection
      </DsfrButton>
    </div>

    <AppLoader v-if="linkStore.isLoading" />
    <DsfrDataTable
      v-else
      v-model:selection="selectedLinkIds"
      v-model:current-page="currentPage"
      :headers-row="['Sélection', 'Lien', 'Description', 'Type de lien', 'Actions']"
      :rows="rows"
      row-key="id"
      pagination
      :rows-per-page="5"
      :pagination-options="[5, 10, 20, 30]"
    >
      <template #cell="{ colKey, cell }">
        <template v-if="colKey === 'Sélection'">
          <input v-model="selectedLinkIds" type="checkbox" :value="cell">
        </template>
        <template v-else-if="colKey === 'Lien'">
          <a :href="cell.to" target="_blank" rel="noopener noreferrer">{{ cell.label }}</a>
        </template>
        <template v-else-if="colKey === 'Actions'">
          <DsfrButton tertiary size="sm" icon="fr-icon-edit-line" :disabled="!canEdit" @click="cell.onClick">
            {{ cell.label }}
          </DsfrButton>
        </template>
        <template v-else>
          {{ cell }}
        </template>
      </template>
    </DsfrDataTable>
  </div>

  <!-- Modals -->
  <DsfrModal
    :opened="linkModal.isModalOpen.value || linkModal.isCreateModalOpen.value"
    :title="linkModal.isCreateModalOpen.value ? 'Ajouter un lien' : 'Modifier le lien'"
    @close="linkModal.closeModal"
  >
    <LinkForm
      :initial-data="linkModal.selectedItem.value"
      :is-submitting="isSubmitting"
      @submit="(formData) => (linkModal.selectedItem.value ? editLink(formData) : createLink(formData))"
      @cancel="linkModal.closeModal"
    />
  </DsfrModal>

  <DeleteConfirmationModal
    :opened="showDeleteConfirmation"
    item-name="liens"
    @confirm="confirmDelete"
    @cancel="() => (showDeleteConfirmation.value = false)"
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
</style>
