<script setup lang="ts">
import api from "@/api/index.js";
import { Permission, type HostingDto, type LabelDto, type TechnicalDebtInfoDto } from "@/client/types.gen";
import MarkdownDisplay from "@/components/MarkdownDisplay.vue";
import useModal from "@/composables/use-modal";
import type { ApplicationWithPerms } from "@/models/Application";
import { routeNames } from "@/router/route-names";
import { useHostingStore } from "@/stores/hostingStore";
import { useToasterStore } from "@/stores/toasterStore";
import type { DsfrAlertType } from "@gouvminint/vue-dsfr";
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import ApplicationForm from "./form/ApplicationForm.vue";
import HostingList from "./hosting/HostingList.vue";
import HostingModal from "./hosting/HostingModal.vue";
import TechnicalDebtCard from "./technical-debt/TechnicalDebtCard.vue";
import TechnicalDebtModal from "./technical-debt/TechnicalDebtModal.vue";
import { useAppPermission } from "@/composables/use-app-permission";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    application: ApplicationWithPerms;
    targetPopulations?: string[];
    small?: boolean;
  }>(),
  {
    targetPopulations: () => [],
  },
);
const emit = defineEmits(["update:application"]);
const toaster = useToasterStore();
const errorMessage = ref<string>("");

const isHostingModalOpen = ref(false);
const isLabelModalOpen = ref(false);
const hostingToEdit = ref<HostingDto | null>(null);
const hostingToDelete = ref<HostingDto | null>(null);
const labelToEdit = ref<LabelDto | null>(null);
const labelToDelete = ref<LabelDto | null>(null);
const isDeleteModalOpen = ref(false);
const isDeleteLabelModalOpen = ref(false);
const hostingStore = useHostingStore();
const labels = ref<LabelDto[]>([]);
const canEditBase = useAppPermission(() => props.application.myPerms, [Permission.APP_WRITE, Permission.APP_WRITE_PRIORITY]);
const canViewHostings = useAppPermission(() => props.application.myPerms, [Permission.HOSTING_READ]);
const canEditHostings = useAppPermission(() => props.application.myPerms, [Permission.HOSTING_WRITE]);

const isTechnicalDebtModalOpen = ref(false);
const technicalDebtInfo = ref<TechnicalDebtInfoDto | null>(null);

async function fetchTechnicalDebtInfo() {
  const response = await api.applicationTechnicalDebtInfoControllerFind({
    path: { applicationId: props.application.id },
    query: { pageSize: 1 },
  });
  if (response.response.status === 404) {
    technicalDebtInfo.value = null;
    return;
  }
  if (!response.response.ok) {
    toaster.addErrorMessage("Erreur lors de la récupération des informations de dette technique.");
    return;
  }
  const technicalDebtInfoResponse = response.data?.results[0];
  technicalDebtInfo.value = technicalDebtInfoResponse ?? null;
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

const application = ref<ApplicationWithPerms>({
  ...props.application,
});

const isLoading = ref(false);

async function fetchLabels(applicationId: string) {
  const response = await api.labelsControllerFindAllSorted({ path: { applicationId } });
  if (!response.response.ok) {
    toaster.addErrorMessage("Erreur lors de la récupération des noms alternatifs");
    throw new Error(`Failed to fetch labels: ${response.response.statusText}`);
  }
  labels.value = response.data ?? [];
}

onMounted(async () => {
  isLoading.value = true;
  try {
    const promises = [fetchLabels(application.value.id), fetchTechnicalDebtInfo()];
    // fetch hostings if allowed
    if (canViewHostings.value) {
      promises.push(hostingStore.fetchHostings(application.value.id));
    }
    await Promise.all(promises);
  } catch {
    toaster.addErrorMessage("Erreur lors du chargement des informations de l'application.");
  } finally {
    isLoading.value = false;
  }
});

const router = useRouter();
function tagSearchLink(tag: string) {
  return router.resolve({ name: routeNames.SEARCHAPP, query: { tag } }).fullPath;
}

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
const priorityConfig = new Map<string, { type: DsfrAlertType; label: string; tooltip: string }>(priorityConfigOptions);

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
  emit("update:application");
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

function businessDivisionSearchLink(businessDivisionId: string) {
  return router.resolve({ name: routeNames.SEARCHAPP, query: { businessDivisionId } }).fullPath;
}
const openCreateLabelModal = () => {
  labelToEdit.value = null;
  isLabelModalOpen.value = true;
};
const openEditLabel = (label: LabelDto) => {
  labelToEdit.value = label;
  isLabelModalOpen.value = true;
};
function openDeleteLabelModal(label: LabelDto) {
  labelToDelete.value = label;
  isDeleteLabelModalOpen.value = true;
}

async function confirmDeletionLabel() {
  if (!labelToDelete.value) return;
  try {
    const response = await api.labelsControllerDelete({
      path: { applicationId: application.value.id, id: labelToDelete.value.id },
    });
    if (!response.response.ok) {
      toaster.addErrorMessage("Erreur lors de la suppression du nom alternatif");
      throw new Error(`Failed to delete label: ${response.response.statusText}`);
    }
    await fetchLabels(application.value.id);
    toaster.addSuccessMessage("Nom alternatif supprimé avec succès");
  } catch {
    errorMessage.value = "Erreur lors de la suppression du nom alternatif";
  } finally {
    labelToDelete.value = null;
    isDeleteLabelModalOpen.value = false;
  }
}

function cancelDeletionLabel() {
  labelToDelete.value = null;
  isDeleteLabelModalOpen.value = false;
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
  <AppLoader v-if="isLoading" data-testid="informations-generales-loader" />
  <div v-else class="responsive-layout" v-bind="$attrs" data-testid="informations-generales">
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
                  title="Modifier – Informations générales"
                  data-testid="info-edit-btn"
                  :disabled="!canEditBase"
                  @click="() => applicationModal.openModal()"
                />
              </div>
            </div>

            <div>
              <h4>ID de l'application</h4>
              <p data-testid="info-application-id">
                {{ application.id }}
              </p>

              <span data-testid="info-business-divisions-container">
                <h4>Directions métier</h4>
                <ul v-if="application.businessDivisions?.length" class="fr-tags-group" data-testid="info-business-divisions">
                  <li v-for="businessDivision in application.businessDivisions" :key="businessDivision.id">
                    <DsfrTag
                      :label="businessDivision.label"
                      :small="small"
                      :link="businessDivisionSearchLink(businessDivision.id)"
                      :title="`Voir les applications de la direction métier ${businessDivision.label}`"
                      :aria-label="`Voir les applications de la direction métier ${businessDivision.label}`"
                      data-testid="info-business-division-link"
                    />
                  </li>
                </ul>
                <p v-else data-testid="info-business-divisions">Aucune</p>
              </span>

              <div v-if="application.shortName">
                <h4>Nom court</h4>
                <p data-testid="info-short-name">
                  {{ application.shortName }}
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

              <h4 class="fr-mt-3w">Population</h4>
              <ul data-testid="info-populations">
                <li v-for="targetPopulation in application.targetPopulations" :key="targetPopulation">
                  <DsfrTag :label="targetPopulation" :small="small" />
                </li>
              </ul>

              <h4 class="fr-mt-3w">Tags</h4>
              <ul class="fr-tags-group" data-testid="info-tags">
                <li v-for="tag in application.tags" :key="tag">
                  <DsfrTag
                    :label="tag"
                    :small="small"
                    :link="tagSearchLink(tag)"
                    :title="`Voir les applications avec le tag ${tag}`"
                    :aria-label="`Voir les applications avec le tag ${tag}`"
                    data-testid="info-tag-link"
                  />
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
                  :label="getPriorityBadgeType(application.priorityRestart)?.label ?? 'Non définie'"
                  :type="getPriorityBadgeType(application.priorityRestart)?.type ?? 'error'"
                  :small="small"
                  :title="getPriorityBadgeType(application.priorityRestart)?.tooltip"
                  :aria-label="`Priorité de redémarrage : ${getPriorityBadgeType(application.priorityRestart)?.tooltip}`"
                  data-testid="info-priority-badge"
                />
              </template>
              <template v-else>
                <p class="fr-text--sm fr-text--italic" data-testid="info-priority-empty">Aucune priorité définie.</p>
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
                <h3 class="fr-card__title">Hébergement</h3>
              </div>
              <div class="fr-col-auto">
                <DsfrButton
                  tertiary
                  size="sm"
                  class="fr-btn--icon-left fr-icon-add-line"
                  label="Ajouter"
                  title="Ajouter un hébergement"
                  data-testid="info-add-hosting-btn"
                  :disabled="!canEditHostings"
                  @click="isHostingModalOpen = true"
                />
              </div>
            </div>
            <HostingList :hostings="hostingStore.hostings" :can-edit="canEditHostings" @edit="openEditHosting" @delete="openDeleteModal" />
          </div>
        </div>
      </div>

      <div class="fr-card" data-testid="info-labels">
        <div class="fr-card__body">
          <div class="fr-card__content">
            <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
              <div class="fr-col">
                <h3 class="fr-card__title">Noms alternatifs</h3>
              </div>
              <div class="fr-col-auto">
                <DsfrButton
                  tertiary
                  size="sm"
                  class="fr-btn--icon-left fr-icon-add-line"
                  label="Ajouter"
                  title="Ajouter des noms alternatifs"
                  data-testid="info-add-label-btn"
                  :disabled="!canEditBase"
                  @click="openCreateLabelModal"
                />
              </div>
            </div>
            <LabelList :labels="labels" :can-edit="canEditBase" @edit="openEditLabel" @delete="openDeleteLabelModal" />
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
    @hosting-created="isHostingModalOpen = false"
  />

  <HostingModal
    v-if="hostingToEdit"
    :application-id="application.id"
    :initial-hosting="hostingToEdit"
    :error-message="errorMessage"
    @close="hostingToEdit = null"
    @hosting-updated="hostingToEdit = null"
  />
  <DeleteConfirmationModal
    v-if="isDeleteModalOpen"
    :opened="isDeleteModalOpen"
    item-name="l'hébergement"
    @confirm="confirmDeletionHosting"
    @cancel="cancelDeletionHosting"
  />

  <LabelModal
    v-if="isLabelModalOpen"
    :application-id="application.id"
    :initial-label="labelToEdit ?? undefined"
    :error-message="errorMessage"
    @close="isLabelModalOpen = false"
    @label-created="
      fetchLabels(application.id);
      isLabelModalOpen = false;
    "
    @label-updated="
      fetchLabels(application.id);
      isLabelModalOpen = false;
    "
  />
  <DeleteConfirmationModal
    v-if="isDeleteLabelModalOpen"
    :opened="isDeleteLabelModalOpen"
    item-name="le nom alternatif"
    @confirm="confirmDeletionLabel"
    @cancel="cancelDeletionLabel"
  />

  <DsfrModal
    size="lg"
    :opened="isModalOpened"
    title="Modifier l'application"
    data-testid="info-edit-modal"
    @close="applicationModal.closeModal"
  >
    <ApplicationForm
      mode="edit"
      :initial-data="{ ...application }"
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

/* `<span>` (inline) ne contenant que des enfants block (`h4`, `ul`/`p`) : sans ça, le
   navigateur éclate la boîte du span autour de ses enfants ("block-in-inline"), et
   `getBoundingClientRect()` sur ce testid ne recouvre pas le contenu réel — le scroll
   automatique du tour d'onboarding vise alors un point qui ne correspond à rien de visible. */
[data-testid="info-business-divisions-container"] {
  display: block;
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
