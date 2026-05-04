<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import api from "@/api";

const props = defineProps<{
  id: string;
  applicationId?: string;
}>();

const loading = ref(false);
const error = ref<string | null>(null);
const dataSource = ref<any | null>(null);

const infoItems = computed(() => {
  if (!dataSource.value) return [];

  return [
    { label: "Description", value: dataSource.value.description },
    { label: "Donnée référentielle", value: dataSource.value.isReference ? "Oui" : "Non" },
    { label: "Exemple", value: dataSource.value.example },
    { label: "Fréquence de mise à jour", value: dataSource.value.updateFrequency?.label },
  ];
});

const classificationItems = computed(() => {
  if (!dataSource.value) return [];

  return [
    // { label: "Famille", value: dataSource.value.family?.label },
    { label: "Sensibilité", value: dataSource.value.sensibility?.label },
    // { label: "Open data", value: dataSource.value.openData?.label },
  ];
});

const kpis = computed(() => {
  if (!dataSource.value) return [];

  return [
    { label: "Volumétrie", value: dataSource.value.volumetry },
    { label: "Ajouts mensuels", value: dataSource.value.monthlyVolumetry },
    { label: "Durée de conservation", value: dataSource.value.conservation },
  ];
});

const sensitivityBadge = computed(() => {
  const s = dataSource.value?.sensibility?.label || "";
  const l = s.toLowerCase();

  if (l.includes("faible")) return [{ label: s, type: "success" }];
  if (l.includes("moyen")) return [{ label: s, type: "info" }];
  if (l.includes("élevé")) return [{ label: s, type: "warning" }];
  if (l.includes("très")) return [{ label: s, type: "error" }];

  return [{ label: s, type: "default" }];
});

async function fetchDataSource() {
  if (!props.id || !props.applicationId) return;

  loading.value = true;
  error.value = null;

  try {
    const response = await api.dataSourceControllerFindOne({
      path: {
        applicationId: props.applicationId,
        id: props.id,
      },
    });

    if (!response.response.ok) {
      throw new Error("Erreur API");
    }

    dataSource.value = response.data;
  } catch (e) {
    console.error(e);
    error.value = "Impossible de charger la source de données.";
  } finally {
    loading.value = false;
  }
}

onMounted(fetchDataSource);
watch(() => props.id, fetchDataSource);
</script>

<template>
  <div class="fr-container fr-py-4w">
    <!-- LOADING -->
    <div v-if="loading" class="fr-mb-2w">
      <p>Chargement...</p>
    </div>

    <!-- ERROR -->
    <div v-else-if="error" class="fr-alert fr-alert--error fr-mb-2w">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="dataSource">
      <!-- ================= HEADER ================= -->

      <h1 class="fr-h3 fr-mb-2w">{{ dataSource.name }}</h1>

      <!-- ================= KPIs ================= -->
      <div class="fr-grid-row fr-grid-row--gutters fr-mb-4w">
        <div v-for="kpi in kpis" :key="kpi.label" class="fr-col-12 fr-col-md-4">
          <div
            class="fr-card fr-p-3w fr-text--center"
            :class="{
              'fr-card--blue-ecume': kpi.label === 'Volumétrie',
              'fr-card--green-tilleul-verveine': kpi.label === 'Ajouts mensuels',
              'fr-card--orange-terre-battue': kpi.label === 'Durée de conservation',
            }"
          >
            <span
              class="fr-icon fr-mb-1w"
              :class="{
                'fr-icon-database-line': kpi.label === 'Volumétrie',
                'fr-icon-refresh-line': kpi.label === 'Ajouts mensuels',
                'fr-icon-time-line': kpi.label === 'Durée de conservation',
              }"
              style="font-size: 26px; display: block"
            ></span>
            <p class="fr-text--xs fr-m-0">{{ kpi.label }}</p>
            <p class="fr-h4 fr-m-0">{{ kpi.value ?? "—" }}</p>
          </div>
        </div>
      </div>

      <!-- ================= MAIN GRID ================= -->
      <div class="fr-grid-row fr-grid-row--gutters">
        <!-- INFORMATIONS (métier) -->
        <div class="fr-col-12 fr-col-md-8">
          <div class="fr-card fr-p-3w">
            <h3 class="fr-mb-2w">Informations</h3>

            <div v-for="item in infoItems.filter((i) => i.value)" :key="item.label" class="fr-py-1w fr-border-bottom">
              <h6 class="fr-text--sm fr-m-0">
                {{ item.label }}
                <span class="fr-icon-information-line fr-icon--sm fr-ml-1v" :title="item.label"></span>
              </h6>

              <p class="fr-text--lg fr-m-0">
                {{ item.value }}
              </p>
            </div>
          </div>
        </div>

        <!-- TECHNIQUE -->
        <div class="fr-col-12 fr-col-md-4">
          <div class="fr-card fr-p-3w fr-card--grey">
            <!-- CLASSIFICATION -->
            <h4 class="fr-text--mention-grey fr-mb-1w">Classification de la donnée</h4>

            <div class="fr-flex fr-flex-column fr-gap-2w fr-mb-3w">
              <!-- Famille -->
              <div>
                <h6 class="fr-text--xs fr-m-0">
                  Famille
                  <i class="fr-icon-information-line fr-icon--sm fr-ml-1v" title="Famille de la donnée"></i>
                </h6>
                <span class="fr-badge fr-badge--info fr-badge--no-icon">
                  {{ dataSource.family?.label || "—" }}
                </span>
              </div>

              <!-- Type -->
              <div>
                <h6 class="fr-text--xs fr-m-0">
                  Type
                  <i class="fr-icon-information-line fr-icon--sm fr-ml-1v" title="Type de la donnée"></i>
                </h6>
                <span class="fr-badge fr-badge--purple-glycine fr-badge--no-icon">
                  {{ dataSource.type?.label || "—" }}
                </span>
              </div>

              <!-- Sensibilité -->
              <div>
                <h6 class="fr-text--xs fr-m-0">
                  Sensibilité
                  <i class="fr-icon-information-line fr-icon--sm fr-ml-1v" title="Niveau de sensibilité de la donnée"></i>
                </h6>
                <span
                  class="fr-badge"
                  :class="{
                    'fr-badge--success': dataSource.sensibility?.label?.toLowerCase().includes('faible'),
                    'fr-badge--info': dataSource.sensibility?.label?.toLowerCase().includes('moyen'),
                    'fr-badge--warning': dataSource.sensibility?.label?.toLowerCase().includes('élevé'),
                    'fr-badge--error': dataSource.sensibility?.label?.toLowerCase().includes('très'),
                  }"
                >
                  {{ dataSource.sensibility?.label || "—" }}
                </span>
              </div>

              <!-- Open Data -->
              <div v-if="dataSource.isOpenData">
                <h6 class="fr-text--xs fr-m-0">
                  Open Data
                  <i class="fr-icon-information-line fr-icon--sm fr-ml-1v" title="Donnée ouverte au public"></i>
                </h6>
                <span class="fr-badge fr-badge--green-emeraude fr-badge--no-icon"> Actif </span>
              </div>
            </div>

            <!-- TECHNIQUE -->
            <h4 class="fr-mb-2w">Technique</h4>

            <div
              v-for="item in [
                { label: 'Base de données', value: dataSource.databaseName },
                { label: 'Table', value: dataSource.databaseTableName },
                { label: 'Noms des champs', value: dataSource.fields },
              ].filter((i) => i.value)"
              :key="item.label"
              class="fr-py-1w"
            >
              <h6 class="fr-text--sm fr-m-0">
                {{ item.label }}
              </h6>
              <p class="fr-text--md fr-m-0">
                {{ item.value }}
              </p>
            </div>
          </div>
        </div>

        <!-- Décommenté quand on aura les données de réutilisation dans l'API-->
        <!-- APPLICATIONS UTILISATRICES
      <div class="fr-col-12">
        <div class="fr-card fr-p-3w fr-mt-4w">
          <h3 class="fr-mb-2w">Applications utilisant cette donnée</h3>

          <div v-if="dataSource.reutilization > 0">
            <ul class="fr-m-0 fr-pl-2w">
              <li v-for="app in dataSource.reutilization" :key="app.id" class="fr-mb-1w">
                <router-link :to="`/applications/${app.id}`" class="fr-link">
                  {{ app.name }}
                </router-link>
              </li>
            </ul>
          </div>

          <div v-else>
            <p class="fr-text--sm">Aucune application référencée.</p>
          </div>
        </div>
      </div> -->
      </div>
    </div>

    <div v-else>Aucune donnée.</div>
  </div>
</template>
