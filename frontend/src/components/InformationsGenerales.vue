<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import type { Application, Label } from "@/models/Application";
import MarkdownDisplay from "@/components/MarkdownDisplay.vue";
import useToaster from "@/composables/use-toaster";
import Applications from "@/api/application";
import Labels from "@/api/label";
import ApplicationForm from "./form/ApplicationForm.vue";
import useModal from "@/composables/use-modal";
import HostingList from "./hosting/HostingList.vue";
import HostingModal from "./hosting/HostingModal.vue";
import { useHostingStore } from "@/stores/hostingStore";
import type { Hosting } from "@/models/Hosting";
import Users from "@/api/user";

const isSubmitting = ref(false);
const toaster = useToaster();
const emit = defineEmits(["update:application"]);
const loading = ref(false);

const props = defineProps<{
  application: Application;
  tags: string[];
  targetPopulations: string[];
  small?: boolean;
}>();

const isHostingModalOpen = ref(false);
const hostingToEdit = ref<Hosting | null>(null);
const hostingToDelete = ref<Hosting | null>(null);
const isDeleteModalOpen = ref(false);
const hostingStore = useHostingStore();
const userPermissions = ref(null);

onMounted(async () => {
  if (props.application?.id) {
    await hostingStore.fetchHostings(props.application.id);
    labels.value = await Labels.findByApplication(props.application.id);
  }
  userPermissions.value = await Users.getUser().then((response) => {
    return response.permissions.split(",");
  });
});

const application = ref<Application>({
  ...props.application,
  labels: props.application.labels ?? [],
});
const labels = ref<Label[]>([]);

const applicationModal = useModal();
const isModalOpened = computed(() => applicationModal.isModalOpen.value);

const priorityConfig = new Map<string, { type: string; label: string; tooltip: string }>([
  [
    "R0",
    {
      type: "error",
      label: "R0 – Immédiat (H24)",
      tooltip: "Le socle technique indispensable sans lequel les applications ne peuvent être relancées (travaux en H24)",
    },
  ],
  [
    "R1",
    {
      type: "warning",
      label: "R1 – Dès que le socle technique est rétabli (H24)",
      tooltip: "Les applications prioritaires supportant les missions",
    },
  ],
  [
    "R1_STAR",
    {
      type: "warning",
      label: "R1* – Selon période d'activité",
      tooltip:
        "Equivalent à R1 si en activité, Equivalent à R3 si en sommeil - Les applications prioritaires supportant les missions régaliennes ayant des périodes d'utilisation d'activité durant lesquelles l'indisponibilité présente des conséquences opérationnelles majeures et de sommeil durant lesquelles l'indisponibilité ne présente aucune conséquence opérationnelle",
    },
  ],
  [
    "R2",
    {
      type: "info",
      label: "R2 – Dès que possible (H24)",
      tooltip:
        "Les applications opérationnelles dont l'indisponibilité présente des conséquences opérationnelles limitées (travaux en H24)",
    },
  ],
  [
    "R3",
    {
      type: "default",
      label: "R3 – Quand le plus urgent est réalisé (H0)",
      tooltip: "Les applications qui peuvent rester indisponibles sans conséquences opérationnelles (travaux en HO seulement)",
    },
  ],
]);

const getPriorityBadgeType = (priority?: string) =>
  priorityConfig.get(priority ?? "") ?? {
    type: "none",
    label: "Non définie",
    tooltip: "Aucune priorité n'a été définie pour cette application",
  };

async function updateApplication(updatedData: any) {
  isSubmitting.value = true;
  try {
    loading.value = true;
    applicationModal.closeModal();

    let updatedApplication = props.application;
    if (updatedData.updatedGeneralInfo) {
      updatedApplication = await Applications.patchApplication({
        ...props.application,
        ...updatedData.updatedGeneralInfo,
      });
    }
    if (updatedData.deletedLabels.length > 0) {
      const labelIds = updatedData.deletedLabels.map((label: Label) => label.id);
      await Labels.delete(labelIds, props.application.id);
    }
    if (updatedData.updatedLabels.length > 0) {
      await Labels.update(updatedData.updatedLabels);
    }
    if (updatedData.newLabels.length > 0) {
      await Labels.create(updatedData.newLabels, props.application.id);
    }

    application.value = updatedApplication;
    emit("update:application", updatedApplication);
    labels.value = await Labels.findByApplication(props.application.id);
    toaster.addSuccessMessage("Application mise à jour avec succès");
  } catch (error) {
    console.error(error);
    toaster.addErrorMessage("Erreur lors de la mise à jour de l'application");
  } finally {
    isSubmitting.value = false;
    loading.value = false;
  }
}

function openEditHosting(hosting: Hosting) {
  hostingToEdit.value = hosting;
}
function openDeleteModal(hosting: Hosting) {
  hostingToDelete.value = hosting;
  isDeleteModalOpen.value = true;
}

async function confirmDeletionHosting() {
  if (!hostingToDelete.value) return;
  try {
    await hostingStore.deleteHosting(application.value.id, hostingToDelete.value.id);
    toaster.addSuccessMessage("Hébergement supprimé avec succès");
  } catch (error) {
    console.error(error);
    toaster.addErrorMessage("Erreur lors de la suppression de l'hébergement");
  } finally {
    hostingToDelete.value = null;
    isDeleteModalOpen.value = false;
  }
}

function cancelDeletionHosting() {
  hostingToDelete.value = null;
  isDeleteModalOpen.value = false;
}

watch(
  () => props.application,
  (newVal) => {
    application.value = { ...newVal };
  },
  { deep: true, immediate: true },
);
</script>

<template>
  <div class="responsive-layout">
    <div class="responsive-column">
      <div class="fr-card">
        <div class="fr-card__body">
          <div class="fr-card__content">
            <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
              <div class="fr-col">
                <h3 class="fr-mb-0">Informations générales</h3>
              </div>
              <div class="fr-col-auto">
                <DsfrButton
                  tertiary
                  size="sm"
                  class="fr-btn--icon-left fr-icon-edit-line"
                  label="Modifier"
                  @click="applicationModal.openModal()"
                  :disabled="!userPermissions?.includes('write')"
                />
              </div>
            </div>

            <AppLoader v-if="loading" />

            <div v-else>
              <h4>ID de l'application</h4>
              <p>{{ application.id }}</p>

              <div v-if="labels.length > 0">
                <h4>Noms Alternatifs</h4>
                <p>
                  {{
                    labels
                      .map((label) => {
                        const value = label.value || "";
                        const source = label.source && label.source.trim() !== "" ? ` (${label.source})` : "";
                        return `${value}${source}`;
                      })
                      .join(" ; ")
                  }}
                </p>
              </div>

              <h4>Description</h4>
              <MarkdownDisplay :content="application.description" />

              <h4 class="fr-mt-3w">Objectifs</h4>
              <ul v-if="application.purposes?.length">
                <li v-for="purpose in application.purposes" :key="purpose">{{ purpose }}</li>
              </ul>

              <h4 class="fr-mt-3w">Tags</h4>
              <ul v-if="application.tags?.length" class="fr-tags-group">
                <li v-for="tag in application.tags" :key="tag">
                  <DsfrTag :label="tag" :small="small" />
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="responsive-column cards-stack">
      <div class="fr-card">
        <div class="fr-card__body">
          <div class="fr-card__content">
            <h3 class="fr-card__title">Priorité de redémarrage</h3>
            <div class="fr-card__desc">
              <template v-if="application.priorityRestart">
                <DsfrBadge
                  :label="getPriorityBadgeType(application.priorityRestart).label"
                  :type="getPriorityBadgeType(application.priorityRestart).type"
                  :small="small"
                  :title="getPriorityBadgeType(application.priorityRestart).tooltip"
                  :aria-label="`Priorité de redémarrage : ${getPriorityBadgeType(application.priorityRestart).tooltip}`"
                />
              </template>
              <template v-else>
                <p class="fr-text--sm fr-text--italic">Aucune priorité définie.</p>
              </template>
            </div>
          </div>
        </div>
      </div>

      <div class="fr-card">
        <div class="fr-card__body">
          <div class="fr-card__content">
            <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
              <div class="fr-col">
                <h3 class="fr-card__title">Sites d'hébergement</h3>
              </div>
              <div class="fr-col-auto">
                <DsfrButton
                  tertiary
                  size="sm"
                  class="fr-btn--icon-left fr-icon-add-line"
                  label="Ajouter"
                  @click="isHostingModalOpen = true"
                  :disabled="!userPermissions?.includes('write')"
                />
              </div>
            </div>
            <HostingList :application-id="application.id" @edit="openEditHosting" @delete="openDeleteModal" />
          </div>
        </div>
      </div>

      <!-- Carte : Population -->
      <div v-if="(application.targetPopulations ?? []).length > 0" class="fr-card">
        <div class="fr-card__body">
          <div class="fr-card__content">
            <h3 class="fr-card__title">Population</h3>
            <div class="fr-card__desc">
              <ul class="fr-tags-group">
                <li v-for="targetPopulation in application.targetPopulations" :key="targetPopulation">
                  <DsfrTag :label="targetPopulation" :small="small" />
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <HostingModal
    v-if="isHostingModalOpen"
    :applicationId="application.id"
    @hosting-created="handleHostingCreated"
    @close="isHostingModalOpen = false"
  />

  <HostingModal
    v-if="hostingToEdit"
    :applicationId="application.id"
    :initialHosting="hostingToEdit"
    @hosting-updated="handleHostingUpdated"
    @close="hostingToEdit = null"
  />
  <DeleteConfirmationModal
    v-if="isDeleteModalOpen"
    :opened="isDeleteModalOpen"
    itemName="l'hébergement"
    @confirm="confirmDeletionHosting"
    @cancel="cancelDeletionHosting"
  />

  <DsfrModal size="lg" :opened="isModalOpened" title="Modifier l'application" @close="applicationModal.closeModal">
    <ApplicationForm
      v-bind="{ initialData: application, labels }"
      :is-submitting="isSubmitting"
      @submit="updateApplication"
      @cancel="applicationModal.closeModal"
    />
  </DsfrModal>
</template>

<style scoped>
.table-responsive {
  overflow-x: auto;
  width: 100%;
}

.fr-tags-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.responsive-layout {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 2rem;
}

.responsive-column {
  flex: 1 1 100%;
  max-width: 100%;
}

.cards-stack {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

@media screen and (min-width: 768px) {
  .responsive-column {
    flex: 0 0 48%;
    max-width: 48%;
  }
}

.header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  margin: 1em;
  order: 0;
}

.header-button {
  margin: 1em;
  order: 1;
}
</style>
