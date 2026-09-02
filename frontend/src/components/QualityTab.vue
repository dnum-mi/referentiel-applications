<script setup lang="ts">
import type { QualityCampaignActionDto, QualitySummaryDto } from "@/client/types.gen";
import type { Application } from "@/models/Application";
import api from "@/api/index";
import { useToasterStore } from "@/stores/toasterStore";
import { hasQualityIndex } from "@/utils/quality";
import { getQualityNextActions } from "@/utils/quality-next-actions";
import { computed, onActivated, ref } from "vue";

defineOptions({ inheritAttrs: false });

const props = defineProps<{ application: Application }>();

const toaster = useToasterStore();

const isLoading = ref(false);
const summary = ref<QualitySummaryDto | null>(null);
const campaignActions = ref<QualityCampaignActionDto[]>([]);

async function fetchQuality() {
  isLoading.value = true;
  try {
    const [summaryResponse, campaignActionsResponse] = await Promise.all([
      api.applicationControllerGetQualitySummary({
        path: { applicationId: props.application.id },
      }),
      api.applicationControllerGetQualityCampaignActions({
        path: { applicationId: props.application.id },
      }),
    ]);
    summary.value = summaryResponse.data ?? null;
    campaignActions.value = campaignActionsResponse.data ?? [];
  } catch {
    toaster.addErrorMessage("Erreur lors du chargement des informations de qualité.");
  } finally {
    isLoading.value = false;
  }
}

function formatCompletedAt(value: string | Date) {
  return new Date(value).toLocaleDateString("fr-FR");
}

function getComplianceColor(key: keyof QualitySummaryDto["compliances"]): string {
  if (!summary.value) return "yellow-tournesol";
  const c = summary.value.compliances;
  switch (key) {
    case "DSFR": {
      if (c.DSFR === null) return "yellow-tournesol";
      return c.DSFR ? "green-emeraude" : "yellow-tournesol";
    }
    case "RGPD": {
      if (c.RGPD === null) return "yellow-tournesol";
      return c.RGPD ? "green-emeraude" : "yellow-tournesol";
    }
    default:
      return c[key] ? "green-emeraude" : "yellow-tournesol";
  }
}

function getComplianceStatus(key: keyof QualitySummaryDto["compliances"]): string {
  if (!summary.value) return "non";
  const c = summary.value.compliances;
  switch (key) {
    case "DSFR": {
      if (c.DSFR === null) return "non configuré";
      return c.DSFR ? "oui" : "non implémenté";
    }
    case "RGPD": {
      if (c.RGPD === null) return "non configuré";
      return c.RGPD ? "oui" : "non réalisée";
    }
    default:
      return c[key] ? "oui" : "non";
  }
}

const remainingActionsCount = computed(() => (summary.value ? getQualityNextActions(summary.value).length : 0));

// L'onglet est mis en cache par le <KeepAlive> de ApplicationOverview.vue : `onMounted` ne se
// déclenche qu'à la toute première ouverture, pas en revenant sur l'onglet après avoir modifié
// des acteurs/hébergement/conformités ailleurs — d'où des données de qualité périmées. `onActivated`
// se déclenche à chaque (ré)activation du composant caché, y compris le montage initial.
onActivated(fetchQuality);
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w" v-bind="$attrs">
    <div class="fr-col">
      <h2 class="fr-mb-0" data-testid="quality-title">Informations de qualité</h2>
    </div>
  </div>
  <AppLoader v-if="isLoading" data-testid="quality-loader" />
  <div v-else-if="summary" class="fr-grid-row fr-grid-row--gutters">
    <div class="fr-col-12 fr-col-md-4" data-testid="quality-general">
      <h4>Général</h4>
      <DsfrHighlight
        data-testid="quality-description"
        :color="summary.hasDescription ? 'green-emeraude' : 'yellow-tournesol'"
        :small="true"
      >
        Description : {{ summary.hasDescription ? "oui" : "non" }}
      </DsfrHighlight>
      <DsfrHighlight data-testid="quality-hosting" :color="summary.hasHosting ? 'green-emeraude' : 'yellow-tournesol'" :small="true">
        Hébergement : {{ summary.hasHosting ? "oui" : "non" }}
      </DsfrHighlight>
      <DsfrHighlight data-testid="quality-snapvisu" :color="summary.hasSnapvisu ? 'green-emeraude' : 'yellow-tournesol'" :small="true">
        Supervisée : {{ summary.hasSnapvisu ? "oui" : "non" }}
      </DsfrHighlight>
    </div>

    <div class="fr-col-12 fr-col-md-4" data-testid="quality-actors">
      <h4>Acteurs</h4>
      <DsfrHighlight data-testid="quality-actor-moa" :color="summary.actors.MOA ? 'green-emeraude' : 'yellow-tournesol'" :small="true">
        MOA : {{ summary.actors.MOA ? "oui" : "non" }}
      </DsfrHighlight>
      <DsfrHighlight data-testid="quality-actor-moe" :color="summary.actors.MOE ? 'green-emeraude' : 'yellow-tournesol'" :small="true">
        MOE : {{ summary.actors.MOE ? "oui" : "non" }}
      </DsfrHighlight>
      <DsfrHighlight data-testid="quality-actor-heb" :color="summary.actors.HEB ? 'green-emeraude' : 'yellow-tournesol'" :small="true">
        Responsable hébergement : {{ summary.actors.HEB ? "oui" : "non" }}
      </DsfrHighlight>
      <DsfrHighlight data-testid="quality-actor-rep" :color="summary.actors.REP ? 'green-emeraude' : 'yellow-tournesol'" :small="true">
        Exploitation : {{ summary.actors.REP ? "oui" : "non" }}
      </DsfrHighlight>
      <DsfrHighlight data-testid="quality-actor-tma" :color="summary.actors.TMA ? 'green-emeraude' : 'yellow-tournesol'" :small="true">
        TMA : {{ summary.actors.TMA ? "oui" : "non" }}
      </DsfrHighlight>
    </div>

    <div class="fr-col-12 fr-col-md-4" data-testid="quality-compliance">
      <h4>Conformités</h4>
      <DsfrHighlight data-testid="quality-dima" :color="getComplianceColor('DIMA')" :small="true">
        DIMA : {{ getComplianceStatus("DIMA") }}
      </DsfrHighlight>
      <DsfrHighlight data-testid="quality-pdma" :color="getComplianceColor('PDMA')" :small="true">
        PDMA : {{ getComplianceStatus("PDMA") }}
      </DsfrHighlight>
      <DsfrHighlight data-testid="quality-homologation" :color="getComplianceColor('HOMOLOGATION')" :small="true">
        Homologation : {{ getComplianceStatus("HOMOLOGATION") }}
      </DsfrHighlight>
      <DsfrHighlight data-testid="quality-rgaa" :color="getComplianceColor('RGAA')" :small="true">
        RGAA : {{ getComplianceStatus("RGAA") }}
      </DsfrHighlight>
      <DsfrHighlight data-testid="quality-dsfr" :color="getComplianceColor('DSFR')" :small="true">
        DSFR : {{ getComplianceStatus("DSFR") }}
      </DsfrHighlight>
      <DsfrHighlight data-testid="quality-rgpd" :color="getComplianceColor('RGPD')" :small="true">
        RGPD : {{ getComplianceStatus("RGPD") }}
      </DsfrHighlight>
    </div>
  </div>

  <div v-if="campaignActions.length > 0" class="fr-mb-3w" data-testid="quality-campaign-actions">
    <h4>Actions réalisées pendant une campagne qualité</h4>
    <ul>
      <li v-for="action in campaignActions" :key="`${action.campaignId}-${action.actionKey}`">
        {{ action.actionLabel }} — campagne « {{ action.campaignName }} », le {{ formatCompletedAt(action.completedAt) }}
      </li>
    </ul>
  </div>

  <DsfrHighlight v-if="hasQualityIndex(props.application)" :large="true" data-testid="quality-index">
    INDICE QUALITE: {{ props.application.quality }}%
  </DsfrHighlight>

  <QualityScoreBar
    v-if="hasQualityIndex(props.application) && summary"
    :score="props.application.quality!"
    :remaining-count="remainingActionsCount"
  />

  <QualityNextActions v-if="summary" :application-id="props.application.id" :summary="summary" />
</template>
