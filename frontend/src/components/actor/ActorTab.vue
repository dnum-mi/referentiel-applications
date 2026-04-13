<script setup lang="ts">
import api from "@/api/index";
import { type ActorDto, type CreateActorDto, Permission } from "@/client/types.gen";
import OrgaLink from "@/components/organization/OgaLink.vue";
import useModal from "@/composables/use-modal";
import type { APP_PERMISSIONS, Application } from "@/models/Application";
import { useActorTypeStore } from "@/stores/actorTypeStore";
import { useToasterStore } from "@/stores/toasterStore";
import { useUserStore } from "@/stores/userStore";
import type { TableColumn } from "@/types/table";
import type { DsfrButtonProps } from "@gouvminint/vue-dsfr";
import { computed, onBeforeMount, ref } from "vue";
import RefAppTable from "../RefAppTable.vue";
import ActorForm from "./ActorForm.vue";

const props = defineProps<{
  application: Application & { myPerms: Set<APP_PERMISSIONS> };
  isMobile?: boolean;
}>();

const userStore = useUserStore();
const actorTypeStore = useActorTypeStore();
const toaster = useToasterStore();
const actorModal = useModal();
const actors = ref<ActorDto[]>([]);

const selectedActorIds = ref<string[]>([]);
const currentPage = ref(0);
const showDeleteConfirmation = ref(false);
const loading = ref(false);
const canEdit = computed(() => userStore.hasPermissions([Permission.ACTOR_WRITE]));

const columns: TableColumn[] = [
  { field: "Sélection", header: "Sélection", sortable: false },
  { field: "Organisation", header: "Organisation", sortable: false },
  { field: "Type", header: "Type", sortable: false },
  { field: "Email", header: "Email", sortable: false },
  { field: "Prénom", header: "Prénom", sortable: false },
  { field: "Nom", header: "Nom", sortable: false },
  { field: "Actions", header: "Actions", sortable: false },
];

const pageSize = ref(5);
const firstIndex = computed(() => currentPage.value * pageSize.value);

const actorTypesList = computed(() => actorTypeStore.actorTypes);
function getActorTypeLabel(typeId: string): string {
  const type = actorTypesList.value.find((t) => t.id === typeId);
  return type ? type.label : "Type inconnu";
}

const tableRows = computed(() =>
  actors.value.map((actor) => ({
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

async function fetchActorsByApplication(applicationId: string) {
  const response = await api.applicationActorsControllerFindAll({
    path: { applicationId },
    query: { pageSize: 0 },
  });
  actors.value = response.data?.results ?? [];
}

async function updateActor({ id: _id, ...actor }: CreateActorDto & { id?: string }, applicationId: string, actorId: string) {
  const response = await api.applicationActorsControllerUpdated({
    path: { applicationId, id: actorId },
    body: actor,
  });
  if (!response.response.ok) {
    throw new Error(`Failed to update actor for application ${applicationId}`);
  }
  return response.data;
}

async function deleteActor(actorId: string, applicationId: string) {
  return api.applicationActorsControllerDelete({
    path: { applicationId, id: actorId },
  });
}

onBeforeMount(async () => {
  loading.value = true;
  try {
    await actorTypeStore.fetchAll();
    await fetchActorsByApplication(props.application.id);
  } finally {
    loading.value = false;
  }
});

async function handleSaveActors(actor: CreateActorDto & { id?: string }) {
  loading.value = true;
  actorModal.closeModal();

  try {
    if (!actor.id) {
      await api.applicationActorsControllerCreate({
        path: { applicationId: props.application.id },
        body: actor,
      });
    } else {
      await updateActor(actor, props.application.id, actor.id);
    }
    await fetchActorsByApplication(props.application.id);
    toaster.addSuccessMessage("Acteur sauvegardé avec succès !");
  } catch {
    toaster.addErrorMessage("Erreur lors de la sauvegarde de l’acteur.");
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
  const actorsToDelete = actors.value.filter((actor) => selectedActorIds.value.includes(actor.id));

  if (actorsToDelete.length === 0) {
    showDeleteConfirmation.value = false;
    return;
  }

  try {
    const deletePromises = actorsToDelete.map((actor) => deleteActor(actor.id, props.application.id));

    await Promise.all(deletePromises);

    await fetchActorsByApplication(props.application.id);
    selectedActorIds.value = [];
    showDeleteConfirmation.value = false;
    toaster.addSuccessMessage("Acteurs supprimés avec succès !");
  } catch {
    toaster.addErrorMessage("Erreur lors de la suppression d'un ou plusieurs acteurs.");
  }
}

function cancelDelete() {
  showDeleteConfirmation.value = false;
}

function onPage(event: any) {
  currentPage.value = event.page;
  pageSize.value = event.rows;
}

function getCardButtons(actor: ActorDto): DsfrButtonProps[] {
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
      <h3 class="fr-mb-0">Gestion des acteurs</h3>
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

  <div v-if="!loading && actors.length === 0" class="text-center" data-testid="actor-empty-state">
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
      <RefAppTable
        :items="tableRows"
        :columns="columns"
        :paginator="true"
        :rows="pageSize"
        :first="firstIndex"
        :total-records="actors.length"
        data-test-id="actor-table"
        empty-message="Aucun acteur enregistré."
        @page="onPage"
      >
        <template #body-Sélection="{ data }">
          <input v-model="selectedActorIds" type="checkbox" :value="data.Sélection" :data-testid="`actor-row-select-${data.Sélection}`" />
        </template>

        <template #body-Organisation="{ data }">
          <OrgaLink v-if="data.Organisation" :organization-id="data.Organisation"></OrgaLink>
          <template v-else> Aucune organisation </template>
        </template>

        <template #body-Email="{ data }">
          <a
            v-if="data.Email.to"
            :href="data.Email.to"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="actor-email-link"
            :title="`Envoyer un email à ${data.Email.label}`"
            :aria-label="`Envoyer un email à ${data.Email.label}`"
          >
            {{ data.Email.label }}
          </a>

          <span v-else>
            {{ data.Email.label }}
          </span>
        </template>

        <template #body-Actions="{ data }">
          <DsfrButton
            title="Modifier les informations de l'acteur"
            aria-label="Modifier l'acteur"
            tertiary
            size="sm"
            icon="fr-icon-edit-line"
            :disabled="!canEdit"
            data-testid="actor-edit-btn"
            @click="data.Actions.edit"
          >
            Modifier
          </DsfrButton>
        </template>

        <template #body-Type="{ data }">
          <DsfrTag
            v-if="data.Type"
            :label="String(data.Type)"
            small
            class="actor-type-tag"
            :data-testid="`actor-type-tag-${data.Type}`"
          ></DsfrTag>
          <template v-else> Type inconnu </template>
        </template>
      </RefAppTable>
    </template>

    <div v-if="props.isMobile" class="actor-card-list">
      <DsfrCard
        v-for="actor in actors"
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
            <OrgaLink v-if="actor.organizationId" :organization-id="actor.organizationId"></OrgaLink>
            <span v-else>Aucune organisation</span>
            <div v-if="actor.email" class="fr-mt-1v">
              <a
                :href="`mailto:${actor.email}`"
                data-testid="actor-email-link"
                :title="`Envoyer un email à ${actor.email}`"
                :aria-label="`Envoyer un email à ${actor.email}`"
              >
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
      v-bind="{ application, initialData: actorModal.selectedItem.value ?? undefined }"
      :is-submitting="loading"
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
