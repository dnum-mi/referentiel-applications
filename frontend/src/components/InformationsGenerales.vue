<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import type { ApplicationWithPerms } from "@/models/Application";
import MarkdownDisplay from "@/components/MarkdownDisplay.vue";
import { useToasterStore } from "@/stores/toasterStore";
import ApplicationForm from "./form/ApplicationForm.vue";
import useModal from "@/composables/use-modal";
import HostingList from "./hosting/HostingList.vue";
import HostingModal from "./hosting/HostingModal.vue";
import TechnicalDebtCard from "./technical-debt/TechnicalDebtCard.vue";
import TechnicalDebtModal from "./technical-debt/TechnicalDebtModal.vue";
import { useHostingStore } from "@/stores/hostingStore";
import { useUserStore } from "@/stores/userStore";
import { AdminLevel } from "@/models/user";
import type { HostingDto, LabelDto, TechnicalDebtInfoDto } from "@/client/types.gen";
import type { DsfrAlertType } from "@gouvminint/vue-dsfr";
import api from "@/api/index.js";

const props = defineProps<{
  application: ApplicationWithPerms
  targetPopulations: string[]
  small?: boolean
}>();
const emit = defineEmits(["update:application"]);
const toaster = useToasterStore();
const errorMessage = ref<string>("");

const isHostingModalOpen = ref(false);
const hostingToEdit = ref<HostingDto | null>(null);
const hostingToDelete = ref<HostingDto | null>(null);
const isDeleteModalOpen = ref(false);
const hostingStore = useHostingStore();
const userStore = useUserStore();
const canEditBase = computed(() => userStore.adminLevel >= AdminLevel.WRITE || props.application.myPerms.has("writeBase") || props.application.myPerms.has("writePriorityRestart"));
const canViewHostings = computed(() => userStore.adminLevel >= AdminLevel.READ || props.application.myPerms.has("readHostings"));
const canEditHostings = computed(() => userStore.adminLevel >= AdminLevel.WRITE || props.application.myPerms.has("writeHostings"));
const labels = ref<LabelDto[]>([]);

const isTechnicalDebtModalOpen = ref(false);
const technicalDebtInfo = ref<TechnicalDebtInfoDto | null>(null);

async function fetchTechnicalDebtInfo() {
  const response = await api.applicationTechnicalDebtInfoControllerFindOne({ path: { applicationId: props.application.id } });
  if (response.response.status === 404) {
    technicalDebtInfo.value = null;
    return;
  }
  if (!response.response.ok) {
    toaster.addErrorMessage("Erreur lors de la récupération des informations de dette technique.");
    return;
  }
  technicalDebtInfo.value = response.data ?? null;
}

function openTechnicalDebtModal() {
  isTechnicalDebtModalOpen.value = true;
}

function closeTechnicalDebtModal() {
  isTechnicalDebtModalOpen.value = false;
}

function onTechnicalDebtSaved(data: TechnicalDebtInfoDto) {
  technicalDebtInfo.value = data;
  closeTechnicalDebtModal();
}

async function fetchLabels() {
  const response = await api.labelsControllerFindAllSorted({ path: { applicationId: props.application.id } });
  if (!response.data) {
    toaster.addErrorMessage("Erreur lors du chargement des noms alternatifs");
    return;
  }
  labels.value = response.data;
};

onMounted(() => {
  fetchLabels();
  fetchTechnicalDebtInfo();
});
const application = ref<ApplicationWithPerms>({
  ...props.application,
});

const applicationModal = useModal();
const isModalOpened = computed(() => applicationModal.isModalOpen.value);

const priorityConfigOptions = [
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
      type: "info",
      label: "R3 – Quand le plus urgent est réalisé (H0)",
      tooltip: "Les applications qui peuvent rester indisponibles sans conséquences opérationnelles (travaux en HO seulement)",
    },
  ],
] as const;
const priorityConfig = new Map<string, { type: DsfrAlertType, label: string, tooltip: string }>(priorityConfigOptions);

function getPriorityBadgeType(priority?: string) {
  return priority
    ? priorityConfig.get(priority)
    : {
        type: "info" as const,
        label: "Non définie",
        tooltip: "Aucune priorité n'a été définie pour cette application",
      };
}

async function updateApplication() {
  applicationModal.closeModal();
  await fetchLabels();
  emit("update:application", props.application);
}

function openEditHosting(hosting: HostingDto) {
  hostingToEdit.value = hosting;
}
function openDeleteModal(hosting: HostingDto) {
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
    errorMessage.value = "Erreur lors de la suppression de l'hébergement";
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
  <div class="responsive-layout" data-testid="informations-generales">
    <div class="responsive-column">
      <div class="fr-card">
        <div class="fr-card__body">
          <div class="fr-card__content">
            <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
              <div class="fr-col">
                <h3 class="fr-mb-0">
                  Informations générales
                </h3>
              </div>
              <div class="fr-col-auto">
                <DsfrButton
                  tertiary
                  size="sm"
                  class="fr-btn--icon-left fr-icon-edit-line"
                  label="Modifier"
                  data-testid="info-edit-btn"
                  :disabled="!canEditBase"
                  @click="applicationModal.openModal"
                />
              </div>
            </div>

            <div>
              <h4>ID de l'application</h4>
              <p data-testid="info-application-id">
                {{ application.id }}
              </p>

              <div v-if="application.shortName">
                <h4>Nom court</h4>
                <p data-testid="info-short-name">
                  {{ application.shortName }}
                </p>
              </div>


              <div v-if="labels.length > 0" data-testid="info-alt-labels">
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
              <MarkdownDisplay :content="application.description" data-testid="info-description" />

              <h4 class="fr-mt-3w">Objectifs</h4>
              <ul data-testid="info-purposes">
                <li v-for="purpose in application.purposes" :key="purpose">
                  {{ purpose }}
                </li>
              </ul>

              <h4 class="fr-mt-3w">Tags</h4>
              <ul class="fr-tags-group" data-testid="info-tags">
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
            <h3 class="fr-card__title">
              Priorité de redémarrage
            </h3>
            <div class="fr-card__desc">
              <template v-if="application.priorityRestart">
                <DsfrBadge
                  :label="getPriorityBadgeType(application.priorityRestart)?.label ?? 'Non définie'"
                  :type="getPriorityBadgeType(application.priorityRestart)?.type ?? 'error'"
                  :small="small"
                  :title="getPriorityBadgeType(application.priorityRestart)?.tooltip"
                  :aria-label="`Priorité de redémarrage : ${getPriorityBadgeType(application.priorityRestart)?.tooltip}`"
                  data-testid="info-priority-badge"
                />
              </template>
              <template v-else>
                <p class="fr-text--sm fr-text--italic" data-testid="info-priority-empty">
                  Aucune priorité définie.
                </p>
              </template>
            </div>
          </div>
        </div>
      </div>

      <div v-if="canViewHostings" class="fr-card" data-testid="info-hostings">
        <div class="fr-card__body">
          <div class="fr-card__content">
            <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
              <div class="fr-col">
                <h3 class="fr-card__title">
                  Hébergement
                </h3>
              </div>
              <div class="fr-col-auto">
                <DsfrButton
                  tertiary
                  size="sm"
                  class="fr-btn--icon-left fr-icon-add-line"
                  label="Ajouter"
                  data-testid="info-add-hosting-btn"
                  :disabled="!canEditHostings"
                  @click="isHostingModalOpen = true"
                />
              </div>
            </div>
            <HostingList :hostings="hostingStore.hostings" @edit="openEditHosting" @delete="openDeleteModal" />
          </div>
        </div>
      </div>

      <!-- Carte : Population -->
      <div v-if="(application.targetPopulations ?? []).length > 0" class="fr-card" data-testid="info-population">
        <div class="fr-card__body">
          <div class="fr-card__content">
            <h3 class="fr-card__title">
              Population
            </h3>
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

      <TechnicalDebtCard
        :technical-debt-info="technicalDebtInfo"
        :can-edit="canEditBase"
        :small="small"
        data-testid="info-technical-debt"
        @create="openTechnicalDebtModal"
        @edit="openTechnicalDebtModal"
      />
    </div>
  </div>

  <HostingModal
    v-if="isHostingModalOpen"
    :application-id="application.id"
    :error-message="errorMessage"
    @close="isHostingModalOpen = false"
    @hostingCreated="isHostingModalOpen = false"
  />

  <HostingModal
    v-if="hostingToEdit"
    :application-id="application.id"
    :initial-hosting="hostingToEdit"
    :error-message="errorMessage"
    @close="hostingToEdit = null"
    @hostingUpdated="hostingToEdit = null"
  />
  <DeleteConfirmationModal
    v-if="isDeleteModalOpen"
    :opened="isDeleteModalOpen"
    item-name="l'hébergement"
    @confirm="confirmDeletionHosting"
    @cancel="cancelDeletionHosting"
  />

  <DsfrModal size="lg" :opened="isModalOpened" title="Modifier l'application" data-testid="info-edit-modal" @close="applicationModal.closeModal">
    <ApplicationForm
      mode="edit"
      :initial-data="{ ...application, labels: labels }"
      :labels="labels"
      data-testid="info-edit-form"
      @success="updateApplication"
      @cancel="applicationModal.closeModal"
    />
  </DsfrModal>

  <TechnicalDebtModal
    v-if="isTechnicalDebtModalOpen"
    :application-id="application.id"
    :initial-data="technicalDebtInfo"
    @close="closeTechnicalDebtModal"
    @saved="onTechnicalDebtSaved"
  />
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
