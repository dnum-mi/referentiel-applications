<script setup lang="ts">
import { ref, watch } from "vue";
import Applications from "@/api/application";
import type { ExternalRessource } from "@/models/Application";
import useToaster from "@/composables/use-toaster";
import { defineProps, defineEmits } from "vue";
import { linkTypesDict } from "@/composables/use-dictionary";
import LinkForm from "./form/LinkForm.vue";
import useModal from "@/composables/use-modal";

const toaster = useToaster();

const props = defineProps({
  application: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["update:application"]);

const localLinks = ref<ExternalRessource[]>(
  Array.isArray(props.application.externalRessource) ? [...props.application.externalRessource] : [],
);
const selectedLinkIds = ref<string[]>([]);

const linkModal = useModal();
const showDeleteConfirmation = ref(false);

const loading = ref(false);
const isSubmitting = ref(false);

const currentPage = ref<number>(0);
const headers = ["Sélection", "Lien", "Description", "Type de lien", "Actions"];
const rows = ref<(string | { component: string; [k: string]: unknown })[][]>([]);

function getTypeLabel(value: string): string {
  return value ? linkTypesDict[value] || "Type inconnu" : "Aucun type sélectionné";
}

function formatLink(url: string): string {
  if (!url || typeof url !== "string") return "";
  return url.startsWith("http") ? url : "http://" + url;
}

const handleSaveLinks = (newLink) => {
  const index = localLinks.value.findIndex((link) => link.id === newLink.id);
  if (index !== -1) {
    localLinks.value[index] = { ...localLinks.value[index], ...newLink };
  } else {
    localLinks.value.push({ ...newLink });
  }
  saveAll();
};

async function saveAll() {
  for (const link of localLinks.value) {
    if (!link.link || typeof link.link !== "string" || !link.link.trim()) {
      toaster.addErrorMessage("Le lien est requis pour tous les liens.");
      return;
    }
  }

  const existingIds = new Set((props.application.externalRessource || []).map((l: ExternalRessource) => l.id));
  const linksToSave = localLinks.value.map((link) => (existingIds.has(link.id) ? link : { ...link, id: link.id ?? undefined }));
  loading.value = true;
  try {
    const e = await Applications.patchApplication({
      ...props.application,
      externalRessource: linksToSave,
    });
    console.log("new: ", e);

    emit("update:application", {
      ...props.application,
      externalRessource: linksToSave,
    });
    toaster.addSuccessMessage("Liens sauvegardés avec succès !");
    linkModal.closeModal();
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la sauvegarde des liens.");
  } finally {
    loading.value = false;
  }
}

function removeSelectedLinks() {
  if (selectedLinkIds.value.length === 0) {
    toaster.addErrorMessage("Aucune sélection.");
    return;
  }
  showDeleteConfirmation.value = true;
}

function confirmDelete() {
  localLinks.value = localLinks.value.filter((link) => !selectedLinkIds.value.includes(link.id));
  selectedLinkIds.value = [];
  saveAll();
  showDeleteConfirmation.value = false;
}

function cancelDelete() {
  showDeleteConfirmation.value = false;
}

rows.value = localLinks.value.map((link: any) => [
  link.id,
  {
    label: link.link || "Lien vide",
    to: formatLink(link.link),
  },
  link.description || "Description vide",
  getTypeLabel(link.type),
  {
    component: "DsfrButton",
    label: "Modifier",
    onClick: () => linkModal.openModal(link),
  },
]);
watch(
  () => props.application.externalRessource,
  (newVal) => {
    localLinks.value = Array.isArray(newVal) ? [...newVal] : [];
  },
  { deep: true, immediate: true },
);
watch(
  localLinks,
  () => {
    rows.value = localLinks.value.map((link) => [
      link.id,
      {
        label: link.link || "Lien vide",
        to: formatLink(link.link),
      },
      link.description || "Description vide",
      getTypeLabel(link.type),
      {
        component: "DsfrButton",
        label: "Modifier",
        onClick: () => linkModal.openModal(link),
      },
    ]);
  },
  { deep: true },
);
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
    <div class="fr-col">
      <h3 class="fr-mb-0">Gestions des liens</h3>
    </div>
    <div class="fr-col-auto">
      <DsfrButton type="button" class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-add-line" @click="linkModal.openCreateModal()">
        Ajouter un lien
      </DsfrButton>
    </div>
  </div>
  <div v-if="rows.length === 0" class="text-center">
    <p>Aucun lien enregistré.</p>
  </div>
  <div v-else>
    <div class="global-delete">
      <DsfrButton type="button" tertiary @click="removeSelectedLinks" icon="fr-icon-delete-line" :disabled="selectedLinkIds.length === 0">
        Supprimer la sélection
      </DsfrButton>
    </div>
    <DsfrDataTable
      v-model:selection="selectedLinkIds"
      v-model:current-page="currentPage"
      :headers-row="headers"
      :rows="rows"
      row-key="id"
      title="Liste des liens associés"
      pagination
      :rows-per-page="5"
      :pagination-options="[5, 10, 20, 30]"
      bottom-action-bar-class="bottom-action-bar-class"
      pagination-wrapper-class="pagination-wrapper-class"
      sorted="id"
      :sortable-rows="['id']"
    >
      <template #cell="{ colKey, cell }">
        <template v-if="colKey === 'Sélection'">
          <input type="checkbox" :value="cell" v-model="selectedLinkIds" />
        </template>
        <template v-else-if="colKey === 'Lien'">
          <a :href="cell.to" target="_blank" rel="noopener noreferrer">
            {{ cell.label }}
          </a>
        </template>
        <template v-else-if="colKey === 'Actions'">
          <DsfrButton tertiary size="sm" icon="fr-icon-edit-line" @click="cell.onClick">{{ cell.label }}</DsfrButton>
        </template>
        <template v-else>
          {{ cell }}
        </template>
      </template>
    </DsfrDataTable>
  </div>

  <GenericModal
    :opened="linkModal.isModalOpen.value || linkModal.isCreateModalOpen.value"
    :title="linkModal.isCreateModalOpen.value ? 'Ajouter un lien' : 'Modifier le lien'"
    :formComponent="LinkForm"
    :formProps="{ application, initialData: linkModal.selectedItem.value }"
    :is-submitting="isSubmitting"
    @submit="handleSaveLinks"
    @cancel="linkModal.closeModal"
  />

  <DeleteConfirmationModal :opened="showDeleteConfirmation" itemName="liens" @confirm="confirmDelete" @cancel="cancelDelete" />
</template>

<style scoped>
input[type="checkbox"] {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 2px solid var(--dsfr-border, #ccc);
  position: relative;
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;
}
</style>
