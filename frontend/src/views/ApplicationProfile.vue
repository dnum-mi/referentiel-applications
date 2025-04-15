<script setup lang="ts">
import type { Application, Metadata } from "@/models/Application";
import Applications from "@/api/application";
import ApplicationOverview from "@/components/ApplicationOverview.vue";
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import ReportIssue from "@/components/Issue/ReportIssue.vue";
import { formatDate } from "@/composables/use-date";

const route = useRoute();
const id = route.params.id as string;
const application = ref<Application | null>(null);
const metadata = ref<Metadata | null>(null);
const isLoading = ref(false);
const errorMessage = ref("");

async function handleApplicationUpdate(updatedApplication: Application) {
  application.value = updatedApplication;
  metadata.value = await Applications.getLatestMetadata(application.value.id);
}

async function loadApplication() {
  isLoading.value = true;
  try {
    application.value = await Applications.getApplicationById(id);
    metadata.value = await Applications.getLatestMetadata(id);
  } catch (error) {
    errorMessage.value = `Une erreur est survenue lors de la récupération de l'application. (${error})`;
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  loadApplication();
});
</script>

<template>
  <div>
    <DsfrBreadcrumb />
    <div v-if="isLoading">Chargement...</div>
    <div v-else-if="errorMessage">
      {{ errorMessage }}
    </div>
    <div v-else-if="application">
      <h2 class="fr-mt-4w fr-ml-4w">{{ application.label }}</h2>
      <p v-if="metadata" class="subtitle">Dernière modification : {{ formatDate(metadata.updatedAt) || "inconnue" }}</p>
      <ReportIssue class="button-right" :application="application" />
      <ApplicationOverview :application="application" @update:application="handleApplicationUpdate" />
    </div>
  </div>
</template>

<style scoped>
.subtitle {
  font-weight: bold;
  font-size: 1rem;
  color: #666;
  margin-bottom: 0.3em;
}
</style>
