<script setup lang="ts">
import { ref, computed, watch } from "vue";
import Applications from "@/api/application";
import type { ExternalRessource } from "@/models/Application";
import useToaster from "@/composables/use-toaster";
import { defineProps, defineEmits } from "vue";

const toaster = useToaster();

const props = defineProps({
  application: {
    type: Object,
    required: true,
  },
  title: { type: String, default: "" },
  icon: { type: String, default: "" },
  noBorder: { type: Boolean, default: false },
});

function handleApplicationUpdate(updatedApplication) {
  props.application.value = updatedApplication;
  console.log("Application mise à jour:", updatedApplication);
}

const emit = defineEmits(["update:application"]);

const localLinks = ref<ExternalRessource[]>(
  Array.isArray(props.application.externalRessource) ? [...props.application.externalRessource] : [],
);
const selectedLink = ref<ExternalRessource | null>(null);
const isLinkModalOpen = ref(false);
const isCreateLinkModalOpen = ref(false);
const currentPage = ref<number>(1);

const loading = ref(false);
const isSubmitting = ref(false);

const selectedLinkIds = ref<string[]>([]);

const showDeleteConfirmation = ref(false);

const headers = ["Sélection", "Lien", "Description", "Type de lien", "Actions"];

const linkTypesDict = {
  documentation: "Documentation",
  supervision: "Supervision",
  service: "Service",
};

const hasChanges = computed(() => JSON.stringify(localLinks.value) !== JSON.stringify(props.application.externalRessource));

function formatLink(url: string): string {
  if (!url || typeof url !== "string") return "";
  return url.startsWith("http") ? url : "http://" + url;
}
function getTypeLabel(value: string): string {
  return value ? linkTypesDict[value] || "Type inconnu" : "Aucun type sélectionné";
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
  const linksToSave = localLinks.value.map((link) => (existingIds.has(link.id) ? link : { ...link, id: undefined }));

  loading.value = true;
  try {
    const updatedApplication = await Applications.patchApplication({
      ...props.application,
      externalRessource: linksToSave,
    });
    console.log("Link.vue: ", linksToSave);
    emit("update:application", {
      ...props.application,
      externalRessource: linksToSave,
    });
    toaster.addSuccessMessage("Liens sauvegardés avec succès !");
    closeLinkModal();
    closeCreateLinkModal();
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la sauvegarde des liens.");
  } finally {
    loading.value = false;
  }
}

const openLinkModal = (link: ExternalRessource) => {
  selectedLink.value = { ...link };
  isLinkModalOpen.value = true;
  isCreateLinkModalOpen.value = false;
};

const openCreateLinkModal = () => {
  isCreateLinkModalOpen.value = true;
  isLinkModalOpen.value = false;
};

const closeLinkModal = () => {
  selectedLink.value = null;
  isLinkModalOpen.value = false;
};

const closeCreateLinkModal = () => {
  selectedLink.value = null;
  isCreateLinkModalOpen.value = false;
};

function saveLinkChanges() {
  if (selectedLink.value) {
    const index = localLinks.value.findIndex((link) => link.id === selectedLink.value?.id);
    if (index !== -1) {
      localLinks.value[index] = { ...selectedLink.value };
    }
  }
  if (isLinkModalOpen.value) {
    closeLinkModal();
  } else if (isCreateLinkModalOpen.value) {
    closeCreateLinkModal();
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

watch(
  () => props.application.externalRessource,
  (newVal) => {
    localLinks.value = Array.isArray(newVal) ? [...newVal] : [];
  },
  { deep: true, immediate: true },
);
</script>

<template>
  <div class="fr-grid-row fr-grid-row--gutters">
    <div class="fr-col-12">
      <div class="fr-card" :class="{ 'fr-card--no-border': noBorder }">
        <div class="fr-card__body">
          <div class="fr-card__content">
            <slot>
              <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
                <div class="fr-col">
                  <h3 class="fr-mb-0">Gestions des liens</h3>
                </div>
                <div class="fr-col-auto">
                  <DsfrButton
                    type="button"
                    class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-add-line"
                    @click="openCreateLinkModal()"
                    >Ajouter un lien</DsfrButton
                  >
                </div>
              </div>
              <div class="global-delete">
                <DsfrButton type="button" tertiary @click="removeSelectedLinks" :disabled="selectedLinkIds.length === 0">
                  Supprimer la sélection
                </DsfrButton>
              </div>
              <div class="fr-container fr-my-2v w-[800px]">
                <DsfrTable
                  v-model:current-page="currentPage"
                  title="Liste des liens associés"
                  :headers="headers"
                  pagination
                  :rows-per-page="10"
                  :pagination-options="[10, 20, 30]"
                  bottom-action-bar-class="pagination-bottom-bar"
                  pagination-wrapper-class="pagination-wrapper"
                >
                  <tr v-for="link in localLinks" :key="link.id">
                    <td>
                      <input type="checkbox" :value="link.id" v-model="selectedLinkIds" />
                    </td>
                    <td>
                      <a :href="formatLink(link.link)" target="_blank" rel="noopener noreferrer">
                        {{ link.link || "Lien vide" }}
                      </a>
                    </td>
                    <td>{{ link.description || "Description vide" }}</td>
                    <td>{{ getTypeLabel(link.type) }}</td>
                    <td>
                      <DsfrButton type="button" @click="openLinkModal(link)">Éditer</DsfrButton>
                    </td>
                  </tr>
                </DsfrTable>
              </div>
              <DsfrModal :opened="isCreateLinkModalOpen" title="Ajouter un lien" size="lg" @close="closeCreateLinkModal">
                <LinkForm
                  v-if="application"
                  :application="application"
                  :is-submitting="isSubmitting"
                  @submit="handleSaveLinks"
                  @cancel="closeCreateLinkModal"
                  @save-links="handleSaveLinks"
                />
              </DsfrModal>
              <DsfrModal :opened="isLinkModalOpen" title="Modifier le lien" size="lg" @close="closeLinkModal">
                <LinkForm
                  v-if="application"
                  :initial-data="selectedLink"
                  :application="application"
                  :is-submitting="isSubmitting"
                  @submit="handleSaveLinks"
                  @update:application="handleApplicationUpdate"
                  @cancel="closeLinkModal"
                  @save-links="handleSaveLinks"
                />
              </DsfrModal>

              <DsfrModal :opened="showDeleteConfirmation" title="Confirmation de suppression" size="sm" @close="cancelDelete">
                <p>Êtes-vous sûr de vouloir supprimer les liens sélectionnés ? Cette action est irréversible.</p>
                <div class="actions">
                  <DsfrButton type="button" @click="cancelDelete" tertiary>Annuler</DsfrButton>
                  <DsfrButton type="button" @click="confirmDelete" primary>Confirmer</DsfrButton>
                </div>
              </DsfrModal>
            </slot>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.link-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}

.link-table th,
.link-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--dsfr-border, #ccc);
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.link-table td {
  max-width: 200px;
}

.link-table th {
  font-size: 0.95rem;
  font-weight: 600;
}

.link-table tbody tr:nth-child(even) {
  background-color: var(--dsfr-gray-50, #fbfbfb);
}

.link-table tbody tr:hover {
  background-color: var(--dsfr-gray-100, #f7f7f7);
}

.global-delete {
  margin-bottom: 1rem;
  display: flex;
  justify-content: flex-start;
}

.actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.edit-btn {
  font-size: 0.85rem;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  gap: 10px;
  align-items: center;
  margin-top: 20px;
  padding: 10px;
}

.pagination-wrapper .fr-btn {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  border-radius: 0.375rem;
  transition: background-color 0.3s ease;
}

.pagination-wrapper .fr-btn:hover {
  background-color: var(--dsfr-primary-color, #0052cc);
  color: #fff;
}

.pagination-wrapper .fr-btn--current {
  background-color: var(--dsfr-primary-color, #0052cc);
  color: #fff;
  font-weight: bold;
}

.pagination-bottom-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: var(--dsfr-gray-10, #f9f9f9);
  border-radius: 0.375rem;
}

@media (max-width: 768px) {
  .pagination-wrapper {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
