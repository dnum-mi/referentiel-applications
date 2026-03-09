<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useToasterStore } from "@/stores/toasterStore";
import type { Application } from "@/models/Application";
import { useActorStore } from "@/stores/actorStore";
import { useActorTypeStore } from "@/stores/actorTypeStore";
import { useHostingStore } from "@/stores/hostingStore";
import { useLinkStore } from "@/stores/linkStore";
import { useComplianceStore } from "@/stores/complianceStore.js";
import type { ComplianceDto } from "@/client/types.gen";

const props = defineProps<{ application: Application }>();

const toaster = useToasterStore();

const loading = ref(false);
const actorStore = useActorStore();
const actorTypeStore = useActorTypeStore();
const actorTypesList = computed(() => actorTypeStore.actorTypes);
const hostingStore = useHostingStore();
const hostings = computed(() => hostingStore.hostings);
const linkStore = useLinkStore();
const complianceStore = useComplianceStore();
const compliances = ref<ComplianceDto | null>(null);

async function fetchQuality() {
  loading.value = true;
  try {
    await linkStore.fetchLinks(props.application.id);
    compliances.value = await complianceStore.fetchCompliance(props.application.id);
  } catch {
    toaster.addErrorMessage("Erreur lors du chargement des informations de qualité.");
  } finally {
    loading.value = false;
  }
}

function hasActorType(typeCode: string): boolean {
  return actorStore.actors.some((actor) => {
    const type = actorTypesList.value.find((t) => t.id === actor.actorTypeId);
    return type?.code === typeCode;
  });
}

function hasCompliance(complianceType: string): boolean {
  if (!compliances.value) return false;

  switch (complianceType.toUpperCase()) {
    case "DIMA":
      return !!(compliances.value.dima_duration_hours || compliances.value.dima_recovery_manager);
    case "PDMA":
      return !!(compliances.value.pdma_duration_hours || compliances.value.pdma_restoration_manager);
    case "HOMOLOGATION":
      return !!compliances.value.homologation_date_end;
    case "RGAA":
      return !!(compliances.value.rgaa_audit_date || compliances.value.rgaa_score_percentage);
    case "DSFR":
      return !!(compliances.value.dsfr_implemented !== undefined);
    case "RGPD":
      return !!(compliances.value.rgpd_has_aipd !== undefined);
    default:
      return false;
  }
}

function hasLink(linkValue: string): boolean {
  return linkStore.links.some((l) => l.link?.toLowerCase().includes(linkValue.toLowerCase()));
}

// To refactor later
function getComplianceColor(complianceType: string): string {
  if (!compliances.value) return "yellow-tournesol";

  switch (complianceType.toUpperCase()) {
    case "DSFR":
      if (compliances.value.dsfr_implemented === undefined) return "yellow-tournesol";
      return compliances.value.dsfr_implemented ? "green-emeraude" : "yellow-tournesol";
    case "RGPD":
      if (compliances.value.rgpd_has_aipd === undefined) return "yellow-tournesol";
      return compliances.value.rgpd_has_aipd ? "green-emeraude" : "yellow-tournesol";
    case "RGAA":
      if (!compliances.value.rgaa_score_percentage) return "yellow-tournesol";
      if (Number(compliances.value.rgaa_score_percentage) >= 50) return "green-emeraude";
      return "yellow-tournesol";
    default:
      return hasCompliance(complianceType) ? "green-emeraude" : "yellow-tournesol";
  }
}

function getComplianceStatus(complianceType: string): string {
  if (!compliances.value) return "non";

  switch (complianceType.toUpperCase()) {
    case "DSFR":
      if (compliances.value.dsfr_implemented === undefined) return "non configuré";
      return compliances.value.dsfr_implemented ? "oui" : "non implémenté";
    case "RGPD":
      if (compliances.value.rgpd_has_aipd === undefined) return "non configuré";
      return compliances.value.rgpd_has_aipd ? "oui" : "non réalisée";
    default:
      return hasCompliance(complianceType) ? "oui" : "non";
  }
}

onMounted(async () => {
  fetchQuality();
});
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
    <div class="fr-col">
      <h2 class="fr-mb-0" data-testid="quality-title">Informations de qualité</h2>
    </div>
  </div>
  <AppLoader v-if="loading" data-testid="quality-loader" />
  <div v-else class="fr-grid-row fr-grid-row--gutters">
    <div class="fr-col-12 fr-col-md-4" data-testid="quality-general">
      <h4>Général</h4>
      <DsfrHighlight
        data-testid="quality-description"
        :color="!!props.application.description ? 'green-emeraude' : 'yellow-tournesol'"
        :small="true"
      >
        Description : {{ !!props.application.description ? "oui" : "non" }}
      </DsfrHighlight>
      <DsfrHighlight data-testid="quality-hosting" :color="hostings.length > 0 ? 'green-emeraude' : 'yellow-tournesol'" :small="true">
        Hébergement : {{ hostings.length > 0 ? "oui" : "non" }}
      </DsfrHighlight>
      <DsfrHighlight data-testid="quality-snapvisu" :color="hasLink('snapvisu') ? 'green-emeraude' : 'yellow-tournesol'" :small="true">
        Supervisée : {{ hasLink("snapvisu") ? "oui" : "non" }}
      </DsfrHighlight>
    </div>

    <div class="fr-col-12 fr-col-md-4" data-testid="quality-actors">
      <h4>Acteurs</h4>
      <DsfrHighlight data-testid="quality-actor-moa" :color="hasActorType('MOA') ? 'green-emeraude' : 'yellow-tournesol'" :small="true">
        MOA : {{ hasActorType("MOA") ? "oui" : "non" }}
      </DsfrHighlight>
      <DsfrHighlight data-testid="quality-actor-moe" :color="hasActorType('MOE') ? 'green-emeraude' : 'yellow-tournesol'" :small="true">
        MOE : {{ hasActorType("MOE") ? "oui" : "non" }}
      </DsfrHighlight>
      <DsfrHighlight data-testid="quality-actor-heb" :color="hasActorType('HEB') ? 'green-emeraude' : 'yellow-tournesol'" :small="true">
        Responsable hébergement : {{ hasActorType("HEB") ? "oui" : "non" }}
      </DsfrHighlight>
      <DsfrHighlight data-testid="quality-actor-rep" :color="hasActorType('REP') ? 'green-emeraude' : 'yellow-tournesol'" :small="true">
        Exploitation : {{ hasActorType("REP") ? "oui" : "non" }}
      </DsfrHighlight>
      <DsfrHighlight data-testid="quality-actor-tma" :color="hasActorType('TMA') ? 'green-emeraude' : 'yellow-tournesol'" :small="true">
        TMA : {{ hasActorType("TMA") ? "oui" : "non" }}
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

  <DsfrHighlight :large="true" data-testid="quality-index"> INDICE QUALITE: {{ props.application.quality ?? 0 }}% </DsfrHighlight>
</template>

<style scoped></style>
