<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import useToaster from "@/composables/use-toaster";
import { defineProps } from "vue";
import type { Application, Compliance } from "@/models/Application";
import CompliancesApi from "@/api/compliance";
import { useActorStore } from "@/stores/actorStore";
import { useActorTypeStore } from "@/stores/actorTypeStore";
import { useHostingStore } from "@/stores/hostingStore";
import { useLinkStore } from "@/stores/linkStore";

const toaster = useToaster();

const props = defineProps<{ application: Application }>();

const loading = ref(false);
const actorStore = useActorStore();
const actorTypeStore = useActorTypeStore();
const actorTypesList = computed(() => actorTypeStore.actorTypes);
const hostingStore = useHostingStore();
const hostings = computed(() => hostingStore.hostings);
const linkStore = useLinkStore();
const compliances = ref<Compliance>();

const fetchQuality = async () => {
  loading.value = true;
  try {
    await linkStore.fetchLinks(props.application.id);
    compliances.value = await CompliancesApi.getCompliance(props.application.id);
  } catch {
    toaster.addErrorMessage("Erreur lors du chargement des informations de qualité.");
  } finally {
    loading.value = false;
  }
};

const hasActorType = (typeCode: string): boolean => {
  return actorStore.actors.some((actor) => {
    const type = actorTypesList.value.find((t) => t.id === actor.actorTypeId);
    return type?.code === typeCode;
  });
};

const hasCompliance = (complianceType: string): boolean => {
  if (!compliances.value) return false;

  switch (complianceType.toUpperCase()) {
    case "DIMA":
      return !!(compliances.value.dima_duration_hours || compliances.value.dima_recovery_manager);
    case "PDMA":
      return !!(compliances.value.pdma_duration_hours || compliances.value.pdma_restoration_manager);
    case "HOMOLOGATION":
      return !!compliances.value.homologation_date;
    case "RGAA":
      return !!(compliances.value.rgaa_audit_date || compliances.value.rgaa_score_percentage);
    case "DSFR":
      return !!(compliances.value.dsfr_implemented !== undefined);
    case "RGPD":
      return !!(compliances.value.rgpd_has_aipd !== undefined);
    default:
      return false;
  }
};

const hasLink = (linkValue: string): boolean => {
  return linkStore.links.some((l) => l.link?.toLowerCase().includes(linkValue.toLowerCase()));
};

// To refactor later
const getComplianceColor = (complianceType: string): string => {
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
      if (compliances.value.rgaa_score_percentage >= 50) return "green-emeraude";
      return "yellow-tournesol";
    default:
      return hasCompliance(complianceType) ? "green-emeraude" : "yellow-tournesol";
  }
};

const getComplianceStatus = (complianceType: string): string => {
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
};

onMounted(async () => {
  fetchQuality();
});
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
    <div class="fr-col">
      <h2 class="fr-mb-0">Informations de qualité</h2>
    </div>
  </div>
  <AppLoader v-if="loading"></AppLoader>
  <div v-else class="fr-grid-row fr-grid-row--gutters">
    <div class="fr-col-12 fr-col-md-4">
      <h4>Général</h4>
      <DsfrHighlight :color="!!props.application.description ? 'green-emeraude' : 'yellow-tournesol'" :small="true"
        >Description : {{ !!props.application.description ? "oui" : "non" }}</DsfrHighlight
      >
      <DsfrHighlight :color="hostings.length > 0 ? 'green-emeraude' : 'yellow-tournesol'" :small="true"
        >Hébergement : {{ hostings.length > 0 ? "oui" : "non" }}</DsfrHighlight
      >
      <DsfrHighlight :color="hasLink('snapvisu') ? 'green-emeraude' : 'yellow-tournesol'" :small="true"
        >SnapVisu : {{ hasLink("snapvisu") ? "oui" : "non" }}</DsfrHighlight
      >
    </div>

    <div class="fr-col-12 fr-col-md-4">
      <h4>Acteurs</h4>
      <DsfrHighlight :color="hasActorType('MOA') ? 'green-emeraude' : 'yellow-tournesol'" :small="true"
        >MOA : {{ hasActorType("MOA") ? "oui" : "non" }}</DsfrHighlight
      >
      <DsfrHighlight :color="hasActorType('MOE') ? 'green-emeraude' : 'yellow-tournesol'" :small="true"
        >MOE : {{ hasActorType("MOE") ? "oui" : "non" }}</DsfrHighlight
      >
      <DsfrHighlight :color="hasActorType('HEB') ? 'green-emeraude' : 'yellow-tournesol'" :small="true"
        >Responsable hébergement : {{ hasActorType("HEB") ? "oui" : "non" }}</DsfrHighlight
      >
      <DsfrHighlight :color="hasActorType('REP') ? 'green-emeraude' : 'yellow-tournesol'" :small="true"
        >Exploitation : {{ hasActorType("REP") ? "oui" : "non" }}</DsfrHighlight
      >
      <DsfrHighlight :color="hasActorType('TMA') ? 'green-emeraude' : 'yellow-tournesol'" :small="true"
        >TMA : {{ hasActorType("TMA") ? "oui" : "non" }}</DsfrHighlight
      >
    </div>

    <div class="fr-col-12 fr-col-md-4">
      <h4>Conformités</h4>
      <DsfrHighlight :color="getComplianceColor('DIMA')" :small="true">DIMA : {{ getComplianceStatus("DIMA") }}</DsfrHighlight>
      <DsfrHighlight :color="getComplianceColor('PDMA')" :small="true">PDMA : {{ getComplianceStatus("PDMA") }}</DsfrHighlight>
      <DsfrHighlight :color="getComplianceColor('HOMOLOGATION')" :small="true"
        >Homologation : {{ getComplianceStatus("HOMOLOGATION") }}</DsfrHighlight
      >
      <DsfrHighlight :color="getComplianceColor('RGAA')" :small="true">RGAA : {{ getComplianceStatus("RGAA") }}</DsfrHighlight>
      <DsfrHighlight :color="getComplianceColor('DSFR')" :small="true">DSFR : {{ getComplianceStatus("DSFR") }}</DsfrHighlight>
      <DsfrHighlight :color="getComplianceColor('RGPD')" :small="true">RGPD : {{ getComplianceStatus("RGPD") }}</DsfrHighlight>
    </div>
  </div>

  <DsfrHighlight :large="true">INDICE QUALITE: {{ props.application.quality ?? 0 }}%</DsfrHighlight>
</template>

<style scoped></style>
