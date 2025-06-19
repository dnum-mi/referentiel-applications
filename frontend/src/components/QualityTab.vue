<script setup lang="ts">
import { ref, onMounted } from "vue";
import useToaster from "@/composables/use-toaster";
import { defineProps } from "vue";
import Users from "@/api/user";
import type { Application } from "@/models/Application";
import { useActorStore } from "@/stores/actorStore";
import { useActorTypeStore } from "@/stores/actorTypeStore";
import CompliancesApi from "@/api/compliance";

const toaster = useToaster();

const props = defineProps<{ application: Application }>();

const loading = ref(false);
const userPermissions = ref(null);
const actorStore = useActorStore();
const actorTypeStore = useActorTypeStore();

const fetchQuality = async () => {
  loading.value = true;
  try {
    const actors = await actorStore.fetchActorsByApplication(props.application.id);
    const actorsTypesList = actorTypeStore.actorTypes;
    const compliances = await CompliancesApi.getCompliances(props.application.id);
  } catch (error) {
    toaster.addErrorMessage("Erreur lors du chargement des informations de qualité.");
  } finally {
    loading.value = false;
  }
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
      <h3 class="fr-mb-0">Informations de qualité</h3>
    </div>
  </div>
  <AppLoader v-if="loading"></AppLoader>
  <div v-else>
    <h2>Général</h2>
    <p v-if="props.application.description">Description: oui</p>
    <p v-else>Description: non</p>
    <p>Hébergement:</p>
    <p>SnapVisu:</p>

    <h2>Acteurs</h2>
    <p>MOA:</p>
    <p>MOE:</p>
    <p>Responsable Hébergement:</p>
    <p>Exploitation:</p>
    <p>TMA:</p>

    <h2>Conformités</h2>
    <p>PDMA:</p>
    <p>DIMA:</p>
    <p>Homologation:</p>
  </div>
  <h1>INDICE QUALITE: {{ props.application.quality }}%</h1>
</template>

<style scoped></style>
