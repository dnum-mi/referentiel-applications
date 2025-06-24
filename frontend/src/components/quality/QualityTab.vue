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
import BooleanHighlight from "@/components/quality/BooleanHighlight.vue";
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
      <BooleanHighlight label="Description" :value="!!props.application.description" small />
      <BooleanHighlight label="Hébergement" :value="hostings.length > 0" small />
      <BooleanHighlight label="SnapVisu" :value="hasLink('snapvisu')" small />
    </div>

    <div class="fr-col-12 fr-col-md-4">
      <h4>Acteurs</h4>
      <BooleanHighlight label="MOA" :value="hasActorType('MOA')" small />
      <BooleanHighlight label="MOE" :value="hasActorType('MOE')" small />
      <BooleanHighlight label="Responsable Hébergement" :value="hasActorType('HEB')" small />
      <BooleanHighlight label="Exploitation" :value="hasActorType('REP')" small />
      <BooleanHighlight label="TMA" :value="hasActorType('TMA')" small />
    </div>

    <div class="fr-col-12 fr-col-md-4">
      <h4>Conformités</h4>
      <BooleanHighlight label="PDMA" :value="hasCompliance('PDMA')" small />
      <BooleanHighlight label="DIMA" :value="hasCompliance('DIMA')" small />
      <BooleanHighlight label="Homologation" :value="hasCompliance('Homologation')" small />
    </div>
  </div>

  <DsfrHighlight :large="true">INDICE QUALITE: {{ props.application.quality ?? 0 }}%</DsfrHighlight>
</template>

<style scoped></style>
