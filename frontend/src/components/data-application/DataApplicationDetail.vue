<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api from "@/api/index";
import { Permission, type DataApplicationDto } from "@/client/types.gen";
import type { APP_PERMISSIONS } from "@/models/Application";
import { useApplicationStore } from "@/stores/applicationStore";
import { useToasterStore } from "@/stores/toasterStore";
import { useUserStore } from "@/stores/userStore";
import { routeNames } from "@/router/route-names";
import {
  OPEN_DATA_STATUS_LABELS,
  UPDATE_FREQUENCY_LABELS,
  OPEN_DATA_BADGE_CLASS,
  DOCUMENTATION_COLUMNS as documentationColumns,
  EXPOSURE_COLUMNS as exposureColumns,
} from "@/constants/data-catalog.constants";
import type { OpenDataStatus, UpdateFrequency } from "@/client/types.gen.js";
import RefAppTable from "@/components/RefAppTable.vue";
import DeleteConfirmationModal from "@/components/modal/DeleteConfirmationModal.vue";
import DataApplicationModal from "./DataApplicationModal.vue";

const props = defineProps<{
  applicationId: string;
  dataApplicationId: string;
}>();

const router = useRouter();
const toaster = useToasterStore();
const applicationStore = useApplicationStore();
const userStore = useUserStore();

const item = ref<DataApplicationDto | null>(null);
const isLoading = ref(false);
const myPerms = ref<Set<APP_PERMISSIONS>>(new Set());

const canEdit = computed(() => userStore.hasPermissions([Permission.DATA_WRITE], Array.from(myPerms.value)));

const isEditModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const errorMessage = ref("");

async function fetchOne() {
  item.value = null;
  isLoading.value = true;
  try {
    const response = await api.dataCatalogControllerFindOneApplicationData({
      path: { applicationId: props.applicationId, dataApplicationId: props.dataApplicationId },
    });
    if (!response.response.ok) {
      toaster.addErrorMessage("Donnée introuvable.");
      return;
    }
    item.value = response.data ?? null;
  } catch {
    toaster.addErrorMessage("Erreur lors du chargement de la donnée.");
  } finally {
    isLoading.value = false;
  }
}

async function fetchMyPerms() {
  try {
    myPerms.value = await applicationStore.getMyPerms(props.applicationId);
  } catch (error) {
    console.error("Error fetching permissions:", error);
  }
}

onMounted(fetchOne);
onMounted(fetchMyPerms);

async function onDataUpdated() {
  isEditModalOpen.value = false;
  await fetchOne();
}

async function confirmDeletion() {
  try {
    const response = await api.dataCatalogControllerDeleteApplicationData({
      path: { applicationId: props.applicationId, dataApplicationId: props.dataApplicationId },
    });
    if (!response.response.ok) throw new Error("delete failed");
    toaster.addSuccessMessage("Donnée détachée avec succès");
    goToProfileApp(props.applicationId);
  } catch (error) {
    console.error(error);
    errorMessage.value = "Erreur lors de la suppression de la donnée.";
    toaster.addErrorMessage(errorMessage.value);
  } finally {
    isDeleteModalOpen.value = false;
  }
}

// Découpe la famille en segments pour l'affichage hiérarchique
const familyParts = computed(() => item.value?.dataDescription?.family?.path?.split(" > ") ?? []);

// Autres applications utilisant la même donnée (exclut l'application courante)
const otherApplications = computed(() =>
  (item.value?.dataDescription?.dataApplications ?? []).filter((dataApplication) => dataApplication.applicationId !== props.applicationId),
);

const documentationItems = computed(() => (item.value?.documentationUrl ?? []).map((url) => ({ url })));

const exposureItems = computed(() => item.value?.exposures ?? []);

const hasInfoContent = computed(
  () =>
    !!(
      item.value?.dataDescription?.officialUrl ||
      item.value?.dataDescription?.description ||
      item.value?.example ||
      item.value?.dataDescription?.tags?.length
    ),
);

const hasUsageContent = computed(
  () =>
    !!(
      item.value?.sensibility ||
      item.value?.updateFrequency ||
      item.value?.openDataStatus ||
      item.value?.isReference != null ||
      item.value?.businessUsage ||
      item.value?.conservation
    ),
);

function goToProfileApp(appId: string) {
  router.push({ name: routeNames.PROFILEAPP, params: { id: appId, tab: "tab-data" } });
}
</script>

<template>
  <div class="fr-py-4w fr-px-4w" data-testid="data-application-detail">
    <!-- ── Retour + actions ───────────────────────────────────────── -->
    <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
      <div class="fr-col">
        <DsfrButton
          label="Retour à la liste"
          secondary
          icon="ri-arrow-left-line"
          data-testid="data-application-detail-back"
          @click="goToProfileApp(props.applicationId)"
        />
      </div>
      <div v-if="canEdit && item" class="fr-col-auto fr-btns-group fr-btns-group--inline-md detail-actions">
        <DsfrButton
          tertiary
          icon="fr-icon-edit-line"
          label="Modifier"
          data-testid="data-application-detail-edit-btn"
          @click="isEditModalOpen = true"
        />
        <DsfrButton
          tertiary
          icon="fr-icon-delete-bin-line"
          label="Détacher"
          data-testid="data-application-detail-delete-btn"
          @click="isDeleteModalOpen = true"
        />
      </div>
    </div>

    <!-- ── Loading ────────────────────────────────────────────────── -->
    <output
      v-if="isLoading"
      aria-live="polite"
      class="fr-py-6w fr-text--center"
      data-testid="data-application-detail-loading"
      style="display: block"
    >
      <span class="fr-text--sm">Chargement…</span>
    </output>

    <!-- ── Not found ──────────────────────────────────────────────── -->
    <div v-else-if="!item" role="alert" class="fr-alert fr-alert--warning fr-mt-2w" data-testid="data-application-detail-not-found">
      <p>Donnée introuvable.</p>
    </div>

    <!-- ── Contenu principal ──────────────────────────────────────── -->
    <template v-else>
      <!-- ── En-tête : titre + badge + famille ───────────────────── -->
      <div class="fr-grid-row fr-grid-row--middle fr-mb-4w">
        <div class="fr-col">
          <!-- Titre + badge Source de vérité -->
          <div class="detail-title-row">
            <h1 class="fr-h3 fr-mb-0" data-testid="data-application-detail-name">{{ item?.dataDescription?.name ?? "—" }}</h1>
            <span v-if="item?.isReference" class="fr-badge fr-badge--success fr-badge--icon-left fr-icon-check-line">
              Source de vérité
            </span>
          </div>

          <!-- Fil d'ariane famille métier -->
          <div v-if="familyParts.length" class="fr-mt-1w">
            <div class="fr-text--sm fr-mb-0 detail-breadcrumb">
              <span class="fr-icon-links-line fr-icon--sm fr-mr-1v icon-blue" aria-hidden="true" />
              <template v-for="(part, index) in familyParts" :key="part">
                <span :class="{ 'family-part--last': index === familyParts.length - 1 }">
                  {{ part }}
                </span>
                <span v-if="index < familyParts.length - 1" class="fr-mx-1v fr-text-mention--grey"> &gt; </span>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- ── KPI cards ───────────────────────────────────────────── -->
      <div v-if="item?.volumetry != null || item?.monthlyVolumetry != null" class="fr-grid-row fr-grid-row--gutters fr-mb-4w">
        <!-- Volumétrie totale -->
        <div v-if="item?.volumetry != null" class="fr-col-12 fr-col-md-4">
          <div class="fr-p-3w kpi-card">
            <div class="fr-icon-database-fill fr-icon--lg fr-mr-2w icon-blue" aria-hidden="true" />
            <div>
              <p class="fr-text--sm fr-mb-0 kpi-label">Volumétrie totale</p>
              <strong class="fr-h4 fr-mb-0">
                {{ item?.volumetry?.toLocaleString("fr-FR") }}
              </strong>
            </div>
          </div>
        </div>

        <!-- Ajouts mensuels -->
        <div v-if="item?.monthlyVolumetry != null" class="fr-col-12 fr-col-md-4">
          <div class="fr-p-3w kpi-card">
            <div class="fr-icon-line-chart-line fr-icon--lg fr-mr-2w icon-info" aria-hidden="true" />
            <div>
              <p class="fr-text--sm fr-mb-0 kpi-label">Ajouts mensuels</p>
              <strong class="fr-h4 fr-mb-0">
                {{ item?.monthlyVolumetry?.toLocaleString("fr-FR") }}
              </strong>
            </div>
          </div>
        </div>

        <!-- Fréquence de MAJ (3e KPI quand pas de volumétrie mensuelle) -->
        <div v-if="item?.updateFrequency && item?.monthlyVolumetry == null" class="fr-col-12 fr-col-md-4">
          <div class="fr-p-3w kpi-card">
            <div class="fr-icon-timer-fill fr-icon--lg fr-mr-2w icon-warning" aria-hidden="true" />
            <div>
              <p class="fr-text--sm fr-mb-0 kpi-label">Fréquence de MAJ</p>
              <strong class="fr-h4 fr-mb-0">
                {{ UPDATE_FREQUENCY_LABELS[(item?.updateFrequency ?? "") as UpdateFrequency] ?? item?.updateFrequency }}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Grille principale : infos (8) + usage (4) ──────────── -->
      <div class="fr-grid-row fr-grid-row--gutters">
        <!-- Colonne gauche : Informations de la donnée -->
        <div class="fr-col-12 fr-col-md-8">
          <div class="fr-p-3w section-card">
            <h2 class="fr-h5 data-detail__section-title">
              <span class="fr-icon-file-text-line fr-icon--md fr-mr-2w icon-blue" aria-hidden="true" />
              Informations de la donnée
            </h2>
            <hr class="fr-hr fr-my-2w" />

            <!-- URL officielle (source de vérité) -->
            <div v-if="item?.dataDescription?.officialUrl" class="fr-mb-3w">
              <strong>Source officielle&nbsp;:</strong>
              <div class="fr-mt-1v data-detail__section-title">
                <span class="fr-icon-external-link-line fr-icon--sm fr-mr-1v icon-success" aria-hidden="true" />
                <a
                  :href="item?.dataDescription?.officialUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="fr-link fr-text--bold fr-icon-external-link-line fr-link--icon-right"
                >
                  {{ item?.dataDescription?.officialUrl }}
                </a>
              </div>
            </div>

            <!-- Description -->
            <div v-if="item?.dataDescription?.description" class="fr-mb-3w">
              <strong>Description&nbsp;:</strong>
              <p class="fr-mt-1v fr-mb-0">{{ item?.dataDescription?.description }}</p>
            </div>

            <!-- Exemple -->
            <div v-if="item?.example" class="fr-mb-3w">
              <strong>Exemple de contenu&nbsp;:</strong>
              <pre class="fr-mt-1w code-block"><code>{{ item?.example }}</code></pre>
            </div>

            <!-- Tags -->
            <div v-if="item?.dataDescription?.tags?.length" class="fr-mb-0">
              <strong>Tags métier&nbsp;:</strong>
              <div class="fr-tags-group fr-mt-1w">
                <span v-for="tag in item?.dataDescription?.tags" :key="tag.id" class="fr-tag fr-mr-1v fr-mb-1v">
                  {{ tag.name }}
                </span>
              </div>
            </div>

            <!-- Message si aucun champ renseigné -->
            <p v-if="!hasInfoContent" class="fr-text--sm fr-text--italic fr-text-mention--grey fr-mb-0">
              Aucune information complémentaire renseignée.
            </p>
          </div>
        </div>

        <!-- Colonne droite : Usage dans l'application -->
        <div class="fr-col-12 fr-col-md-4">
          <div class="fr-p-3w usage-card">
            <h2 class="fr-h5 data-detail__section-title">
              <span class="fr-icon-settings-5-line fr-icon--md fr-mr-2w icon-info" aria-hidden="true" />
              Usage dans l'application
            </h2>
            <hr class="fr-hr fr-my-2w" />

            <!-- Sensibilité -->
            <div v-if="item?.sensibility" class="fr-mb-3w">
              <p class="fr-text--xs fr-text-mention--grey fr-mb-1v field-label">Sensibilité</p>
              <span
                class="fr-badge"
                :style="
                  item.sensibility.color
                    ? { backgroundColor: item.sensibility.color, color: '#fff', borderColor: item.sensibility.color }
                    : {}
                "
              >
                {{ item?.sensibility?.label }}
              </span>
            </div>

            <!-- Fréquence de MAJ -->
            <div v-if="item?.updateFrequency" class="fr-mb-3w">
              <p class="fr-text--xs fr-text-mention--grey fr-mb-1v field-label">Fréquence de MAJ</p>
              <span class="fr-badge fr-badge--info">
                {{ UPDATE_FREQUENCY_LABELS[(item?.updateFrequency ?? "") as UpdateFrequency] ?? item?.updateFrequency }}
              </span>
            </div>

            <!-- Statut open data -->
            <div v-if="item?.openDataStatus" class="fr-mb-3w">
              <p class="fr-text--xs fr-text-mention--grey fr-mb-1v field-label">Statut open data</p>
              <span class="fr-badge" :class="OPEN_DATA_BADGE_CLASS[(item?.openDataStatus ?? '') as OpenDataStatus] ?? 'fr-badge--info'">
                {{ OPEN_DATA_STATUS_LABELS[(item?.openDataStatus ?? "") as OpenDataStatus] ?? item?.openDataStatus }}
              </span>
            </div>

            <!-- Donnée référentielle -->
            <div v-if="item?.isReference != null" class="fr-mb-3w">
              <p class="fr-text--xs fr-text-mention--grey fr-mb-1v field-label">Donnée référentielle</p>
              <span :class="item?.isReference ? 'fr-badge fr-badge--success' : 'fr-badge'">
                {{ item?.isReference ? "Oui" : "Non" }}
              </span>
            </div>

            <!-- Conservation -->
            <div v-if="item?.conservation" class="fr-mb-3w">
              <p class="fr-text--xs fr-text-mention--grey fr-mb-1v field-label">Conservation</p>
              <span class="fr-badge fr-badge--info">{{ item?.conservation }}</span>
            </div>

            <!-- Usage métier -->
            <div v-if="item?.businessUsage" class="fr-mb-0">
              <p class="fr-text--xs fr-text-mention--grey fr-mb-1v field-label">Usage métier</p>
              <p class="fr-text--sm fr-mb-0">{{ item?.businessUsage }}</p>
            </div>

            <!-- Message si rien -->
            <p v-if="!hasUsageContent" class="fr-text--sm fr-text--italic fr-text-mention--grey fr-mb-0">
              Aucune donnée d'usage renseignée.
            </p>
          </div>
        </div>

        <!-- Ligne inférieure : Liens de documentation -->
        <div v-if="item?.documentationUrl?.length" class="fr-col-12">
          <div class="fr-p-3w section-card--mt">
            <h2 class="fr-h5 data-detail__section-title">
              <span class="fr-icon-global-line fr-icon--md fr-mr-2w icon-blue" aria-hidden="true" />
              Documentation
            </h2>
            <hr class="fr-hr fr-my-2w" />

            <RefAppTable
              :items="documentationItems"
              :columns="documentationColumns"
              :total-records="documentationItems.length"
              :paginator="false"
            >
              <template #body-url="{ data }">
                <a
                  :href="data.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="fr-link fr-icon-external-link-line fr-link--icon-right"
                >
                  {{ data.url }}
                </a>
              </template>
            </RefAppTable>
          </div>
        </div>

        <!-- Ligne inférieure : Exposition -->
        <div v-if="item?.exposures?.length" class="fr-col-12">
          <div class="fr-p-3w section-card--mt">
            <h2 class="fr-h5 data-detail__section-title">
              <span class="fr-icon-global-line fr-icon--md fr-mr-2w icon-blue" aria-hidden="true" />
              Exposition
            </h2>
            <hr class="fr-hr fr-my-2w" />

            <RefAppTable :items="exposureItems" :columns="exposureColumns" :total-records="exposureItems.length" :paginator="false">
              <template #body-type="{ data }">
                <span v-if="data.type" class="fr-badge fr-badge--info">{{ data.type }}</span>
                <span v-else class="fr-text-mention--grey">—</span>
              </template>

              <template #body-format="{ data }">
                <span v-if="data.format" class="fr-text--bold">{{ data.format }}</span>
                <span v-else class="fr-text-mention--grey">—</span>
              </template>

              <template #body-endpoint="{ data }">
                <div class="fr-text--sm">
                  <div v-if="data.endpoint" class="fr-mb-1v">
                    <code>{{ data.endpoint }}</code>
                  </div>
                  <a
                    v-if="data.url"
                    :href="data.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="fr-link fr-icon-external-link-line fr-link--icon-right"
                  >
                    Accéder à la ressource
                  </a>
                  <a
                    v-if="data.swaggerUrl"
                    :href="data.swaggerUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="fr-link fr-icon-external-link-line fr-link--icon-right fr-ml-2v"
                  >
                    Swagger
                  </a>
                  <span v-if="!data.endpoint && !data.url && !data.swaggerUrl" class="fr-text-mention--grey">—</span>
                </div>
              </template>

              <template #body-authenticationType="{ data }">
                <span v-if="data.authenticationType">{{ data.authenticationType }}</span>
                <span v-else class="fr-text-mention--grey">—</span>
              </template>
            </RefAppTable>
          </div>
        </div>

        <!-- Ligne inférieure : Applications réutilisant cette donnée -->
        <div v-if="otherApplications.length" class="fr-col-12">
          <div class="fr-p-3w section-card--mt">
            <h2 class="fr-h5 data-detail__section-title">
              <span class="fr-icon-arrow-right-up-line fr-icon--md fr-mr-2w icon-success" aria-hidden="true" />
              Applications réutilisant cette donnée
            </h2>
            <hr class="fr-hr fr-my-2w" />

            <div class="fr-grid-row fr-grid-row--gutters">
              <div v-for="dataApplication in otherApplications" :key="dataApplication.id" class="fr-col-12 fr-col-md-4">
                <div class="fr-p-2w app-card">
                  <DsfrButton
                    tertiary
                    no-outline
                    :label="dataApplication?.application?.label ?? dataApplication.applicationId"
                    @click="goToProfileApp(dataApplication.applicationId)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <DataApplicationModal
      v-if="isEditModalOpen && item"
      :application-id="props.applicationId"
      :initial-item="item"
      :error-message="errorMessage"
      @close="isEditModalOpen = false"
      @data-updated="onDataUpdated"
    />

    <DeleteConfirmationModal
      v-if="isDeleteModalOpen"
      :opened="isDeleteModalOpen"
      item-name="cette donnée"
      @confirm="confirmDeletion"
      @cancel="isDeleteModalOpen = false"
    />
  </div>
</template>

<style scoped>
/* ── Layout helpers ──────────────────────────────────────────── */
/* .fr-btns-group impose margin-bottom: 1rem et align-items: stretch sur ses .fr-btn (pensé pour un
   empilement mobile) : on neutralise pour aligner ces boutons avec « Retour à la liste ». */
.detail-actions {
  align-items: center;
  margin-bottom: 0;
}

.detail-actions :deep(.fr-btn) {
  margin-bottom: 0;
}

.detail-title-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.detail-breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.data-detail__section-title {
  display: flex;
  align-items: center;
}

/* ── Icon colours ────────────────────────────────────────────── */
.icon-blue {
  color: var(--blue-france-sun-113-625);
}
.icon-info {
  color: var(--info-425-625);
}
.icon-warning {
  color: var(--warning-425-625);
}
.icon-success {
  color: var(--success-425-625);
}

/* ── Family breadcrumb ───────────────────────────────────────── */
.family-part--last {
  font-weight: bold;
}

/* ── KPI cards ───────────────────────────────────────────────── */
.kpi-card {
  background-color: #f6f6f6;
  display: flex;
  align-items: center;
  border-radius: 8px;
}

.kpi-label {
  color: #666;
}

/* ── Section cards ───────────────────────────────────────────── */
.section-card {
  border: 1px solid #ddd;
  border-radius: 4px;
  height: 100%;
}

.usage-card {
  background-color: #f6f6f6;
  border-radius: 4px;
  height: 100%;
}

.section-card--mt {
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-top: 1rem;
}

.app-card {
  background-color: #f6f6f6;
  border: 1px solid #eee;
  border-radius: 4px;
  height: 100%;
}

/* ── Code block ──────────────────────────────────────────────── */
.code-block {
  background-color: #1e1e1e;
  color: #d4d4d4;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.875rem;
  font-family: monospace;
  line-height: 1.5;
}

/* ── Field labels (usage sidebar) ────────────────────────────── */
.field-label {
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
