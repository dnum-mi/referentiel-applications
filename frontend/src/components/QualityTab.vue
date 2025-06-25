<script setup lang="ts">
import { ref, onMounted } from "vue";
import useToaster from "@/composables/use-toaster";
import { defineProps } from "vue";
import Users from "@/api/user";
import type { Application, Compliance } from "@/models/Application";
import CompliancesApi from "@/api/compliance";
import { useActorStore } from "@/stores/actorStore";
import { useActorTypeStore } from "@/stores/actorTypeStore";
import { useHostingStore } from "@/stores/hostingStore";
import { useLinkStore } from "@/stores/linkStore";

const toaster = useToaster();

const props = defineProps<{ application: Application }>();

const loading = ref(false);
const userPermissions = ref(null);
const actorStore = useActorStore();
const actorTypeStore = useActorTypeStore();
const actorTypesList = computed(() => actorTypeStore.actorTypes);
const hostingStore = useHostingStore();
const hostings = computed(() => hostingStore.hostings);
const linkStore = useLinkStore();
const compliances = ref<Compliance[]>([]);

const fetchQuality = async () => {
  loading.value = true;
  try {
    await actorStore.fetchActorsByApplication(props.application.id);
    await hostingStore.fetchHostings(props.application.id);
    await linkStore.fetchLinks(props.application.id);
    compliances.value = await CompliancesApi.getCompliances(props.application.id);
  } catch (error) {
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

const hasCompliance = (complianceName: string): boolean => {
  return compliances.value.some((compliance) => compliance.name?.toLowerCase().includes(complianceName.toLowerCase()));
};

const hasLink = (linkValue: string): boolean => {
  return linkStore.links.some((l) => l.link?.toLowerCase().includes(linkValue.toLowerCase()));
};

onMounted(async () => {
  fetchQuality();
  userPermissions.value = await Users.getUser().then((response) => {
    return response.permissions.split(",");
  });
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
      <DsfrHighlight :color="hasCompliance('PDMA') ? 'green-emeraude' : 'yellow-tournesol'" :small="true"
        >PDMA : {{ hasCompliance("PDMA") ? "oui" : "non" }}</DsfrHighlight
      >
      <DsfrHighlight :color="hasCompliance('DIMA') ? 'green-emeraude' : 'yellow-tournesol'" :small="true"
        >DIMA : {{ hasCompliance("DIMA") ? "oui" : "non" }}</DsfrHighlight
      >
      <DsfrHighlight :color="hasCompliance('Homologation') ? 'green-emeraude' : 'yellow-tournesol'" :small="true"
        >Homologation : {{ hasCompliance("Homologation") ? "oui" : "non" }}</DsfrHighlight
      >
    </div>
  </div>

  <DsfrHighlight :large="true">INDICE QUALITE: {{ props.application.quality ?? 0 }}%</DsfrHighlight>
</template>

<style scoped></style>
