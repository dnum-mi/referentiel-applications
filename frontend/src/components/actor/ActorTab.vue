<script setup lang="ts">
import { ref, computed, onBeforeMount, defineProps, defineEmits } from "vue";
import { useToasterStore } from "@/stores/toasterStore";
import useModal from "@/composables/use-modal";
import { useActorStore } from "@/stores/actorStore";
import { useActorTypeStore } from "@/stores/actorTypeStore";
import ActorForm from "./ActorForm.vue";
import OrgBreadCrumb from "../organization/OrgBreadCrumb.vue";

import type { ApplicationWithPerms } from "@/models/Application";
import { useUserStore } from "@/stores/userStore";
import { AdminLevel } from "@/models/user";
import type { CreateActorDto, Actor } from "@/client/types.gen";

const props = defineProps<{
  application: ApplicationWithPerms,
  isMobile?: boolean,
}>();


const actorStore = useActorStore();
const userStore = useUserStore();
const actorTypeStore = useActorTypeStore();
const toaster = useToasterStore();
const actorModal = useModal<Actor>();

const selectedActorIds = ref<string[]>([]);
const currentPage = ref(0);
const showDeleteConfirmation = ref(false);
const isSubmitting = ref(false);
const loading = ref(false);
const canEdit = computed(() => userStore.adminLevel >= AdminLevel.WRITE || props.application.myPerms.has("writeActors"));

const headers = ["Sélection", "Organisation", "Type", "Email", "Prénom", "Nom", "Actions"];

const actorTypesList = computed(() => actorTypeStore.actorTypes);
function getActorTypeLabel(typeId: string): string {
  const type = actorTypesList.value.find(t => t.id === typeId);
  return type ? type.label : "Type inconnu";
}

const tableRows = computed(() =>
  actorStore.actors.map(actor => ({
    id: actor.id,
    Sélection: actor.id,
    Organisation: actor.organizationId ?? undefined,
    Type: getActorTypeLabel(actor.actorTypeId),
    Email: {
      label: actor.email || "",
      to: actor.email ? `mailto:${actor.email}` : "",
    },
    Prénom: actor.firstname || "",
    Nom: actor.lastname || "",
    Actions: {
      edit: () => actorModal.openModal(actor),
    },
  })),
);

onBeforeMount(async () => {
  await actorTypeStore.fetchAll();
});

async function handleSaveActors(actor: CreateActorDto & { id?: string }) {
  loading.value = true;
  actorModal.closeModal();

  try {
    if (!actor.id) {
      await actorStore.createActor(actor, props.application.id);
    } else {
      await actorStore.updateActor(actor, props.application.id, actor.id);
    }
    await actorStore.fetchActorsByApplication(props.application.id);
    toaster.addSuccessMessage("Acteur sauvegardé avec succès !");
    
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la sauvegarde de l’acteur.");
    console.error("❌ Erreur handleSaveActors :", error.response?.data || error);
  } finally {
    loading.value = false;
  }
}

function removeSelectedActors() {
  if (selectedActorIds.value.length === 0) {
    toaster.addErrorMessage("Aucune sélection.");
    return;
  }
  showDeleteConfirmation.value = true;
}


async function confirmDelete() {
  const actorsToDelete = actorStore.actors.filter(actor => selectedActorIds.value.includes(actor.id));

  if (actorsToDelete.length === 0) {
    showDeleteConfirmation.value = false;
    return;
  }

  try {
    const deletePromises = actorsToDelete.map(actor =>
      actorStore.deleteActor(actor.id, props.application.id)
    );
    
    await Promise.all(deletePromises);

    await actorStore.fetchActorsByApplication(props.application.id);
    selectedActorIds.value = [];
    showDeleteConfirmation.value = false;
    toaster.addSuccessMessage("Acteurs supprimés avec succès !");

  } catch (error) {
    console.error("❌ Erreur confirmDelete :", error);
    toaster.addErrorMessage("Erreur lors de la suppression d'un ou plusieurs acteurs.");
  }
}

function cancelDelete() {
  showDeleteConfirmation.value = false;
}

function getCardButtons(actor: Actor) { 
  return [
    {
      label: "Modifier",
      icon: "fr-icon-edit-line",
      tertiary: true,
      size: "sm",
      disabled: !canEdit.value,
      onClick: (event?: Event) => {
        if (event && typeof event.stopPropagation === "function") event.stopPropagation();
        actorModal.openModal(actor);
      },
    },
    {
      label: "Supprimer",
      icon: "fr-icon-delete-line",
      tertiary: true,
      size: "sm",
      disabled: !canEdit.value,
      onClick: (event?: Event) => {
        if (event && typeof event.stopPropagation === "function") event.stopPropagation();
        selectedActorIds.value = [actor.id];
        showDeleteConfirmation.value = true;
      },
    },
  ];
}
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w" data-testid="actor-tab">
    <div class="fr-col">
      <h3 class="fr-mb-0">
        Gestion des acteurs
      </h3>
    </div>
    <div class="fr-col-auto">
      <DsfrButton
        type="button"
        title="Ajouter un nouvel acteur à l’application"
        aria-label="Ajouter un acteur"
        class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-add-line"
        :disabled="!canEdit"
        data-testid="actor-add-btn"
        @click="actorModal.openCreateModal()"
      >
        Ajouter un acteur
      </DsfrButton>
    </div>
  </div>

  <div v-if="!loading && actorStore.actors.length === 0" class="text-center" data-testid="actor-empty-state">
    <p>Aucun acteur enregistré.</p>
  </div>

  <div v-else>
    <div v-if="!props.isMobile" class="global-delete">
      <DsfrButton
        type="button"
        tertiary
        icon="fr-icon-delete-line"
        :disabled="selectedActorIds.length === 0 || !canEdit"
        data-testid="actor-bulk-delete-btn"
        title="Supprimer tous les acteurs sélectionnés"
        aria-label="Supprimer la sélection"
        @click="removeSelectedActors"
      >
        Supprimer la sélection
      </DsfrButton>
    </div>

    <AppLoader v-if="loading" data-testid="actor-loader"></AppLoader>

    <template v-if="!loading && !props.isMobile">
      <DsfrDataTable
        v-model:selection="selectedActorIds"
        v-model:current-page="currentPage"
        :headers-row="headers"
        :rows="tableRows"
        row-key="id"
        title="Liste des acteurs associés"
        pagination
        :rows-per-page="5"
        :pagination-options="[5, 10, 20, 30]"
        bottom-action-bar-class="bottom-action-bar-class"
        pagination-wrapper-class="pagination-wrapper-class"
        sorted="id"
        :sortable-rows="['id']"
        data-testid="actor-table"
      >
        <template #cell="{ colKey, cell }">
          <template v-if="colKey === 'Sélection'">
            <input
              v-model="selectedActorIds"
              type="checkbox" :value="cell" :data-testid="`actor-row-select-${cell}`"
            >
          </template>

          <template v-else-if="colKey === 'Organisation'">
            <OrgBreadCrumb v-if="cell" :organization-id="cell"></OrgBreadCrumb>
            <template v-else>
              Aucune organisation
            </template>
          </template>

          <template v-else-if="colKey === 'Email'">
            <a
              v-if="cell.to"
              :href="cell.to"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="actor-email-link"
              :title="`Envoyer un email à ${cell.label}`"
              :aria-label="`Envoyer un email à ${cell.label}`"
            >
              {{ cell.label }}
            </a>
          </template>

          <template v-else-if="colKey === 'Actions'">
            <DsfrButton
              title="Modifier les informations de l’acteur"
              aria-label="Modifier l’acteur"
              tertiary size="sm" icon="fr-icon-edit-line" :disabled="!canEdit" data-testid="actor-edit-btn" @click="cell.edit"
            >
              Modifier
            </DsfrButton>
          </template>

          <template v-else-if="colKey === 'Type'">
            <DsfrTag v-if="cell" :label="String(cell)" small class="actor-type-tag" :data-testid="`actor-type-tag-${cell}`"></DsfrTag>
            <template v-else>
              Type inconnu
            </template>
          </template>

          <template v-else>
            {{ cell }}
          </template>
        </template>
      </DsfrDataTable>
    </template>

    <div v-if="props.isMobile" class="actor-card-list">
      <DsfrCard
        v-for="actor in actorStore.actors"
        :key="actor.id"
        :title="`${actor.firstname || ''} ${actor.lastname || ''}`.trim() || '—'"
        :description="actor.email || ''"
        :buttons="getCardButtons(actor)"
        size="sm"
        :noArrow="true"
        class="fr-mb-2w"
        :data-testid="`actor-card-${actor.id}`"
      >
        <template #start-details>
          <DsfrTag
            :label="getActorTypeLabel(actor.actorTypeId)"
            small
            class="fr-mr-2w"
            :data-testid="`actor-type-tag-${actor.id}`"
          ></DsfrTag>
        </template>

        <template #end-details>
          <div class="fr-text--sm">
            <strong class="fr-mr-1w">Organisation :</strong>
            <OrgBreadCrumb v-if="actor.organizationId" :organization-id="actor.organizationId"></OrgBreadCrumb>
            <span v-else>Aucune organisation</span>
            <div v-if="actor.email" class="fr-mt-1v">
              <a :href="`mailto:${actor.email}`" data-testid="actor-email-link" :title="`Envoyer un email à ${actor.email}`" :aria-label="`Envoyer un email à ${actor.email}`">
                {{ actor.email }}
              </a>
            </div>
          </div>
        </template>
      </DsfrCard>
    </div>
  </div>

  <DsfrModal
    :opened="actorModal.isModalOpen.value || actorModal.isCreateModalOpen.value"
    :title="actorModal.isCreateModalOpen.value ? 'Ajouter un acteur' : 'Modifier l\'acteur'"
    data-testid="actor-modal"
    @close="actorModal.closeModal"
  >
    <ActorForm
      v-bind="{ application, initialData: actorModal.selectedItem.value }"
      :is-submitting="isSubmitting"
      :actor-types="actorTypesList"
      data-testid="actor-form-container"
      @submit="handleSaveActors"
      @cancel="actorModal.closeModal"
    ></ActorForm>
  </DsfrModal>

  <DeleteConfirmationModal
    :opened="showDeleteConfirmation"
    item-name="acteurs"
    data-testid="actor-delete-modal"
    @confirm="confirmDelete"
    @cancel="cancelDelete"
  ></DeleteConfirmationModal>
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

.truncate {
  display: inline-block;
  max-width: 230px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actor-card-list {
  display: flex;
  flex-direction: column;
}
.actor-type-tag {
  display: inline-block;
}
</style>