<script setup lang="ts">
import type { Application, Label } from "@/models/Application";
import Applications from "@/api/application";
import ApplicationOverview from "@/components/ApplicationOverview.vue";
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import ReportIssue from "@/components/ReportIssue.vue";
import axios from "axios";

const route = useRoute();
const id = route.params.id as string;
const application = ref<Application | null>(null);
const isLoading = ref(false);
const errorMessage = ref("");

const currentLabel = ref<Label | null>(null);

function handleApplicationUpdate(updatedApplication: Application) {
  application.value = updatedApplication;
}

async function loadApplication() {
  isLoading.value = true;
  try {
    application.value = await Applications.getApplicationById(id);
    const response = await axios.get(`applications/${id}/labels/current`);
    currentLabel.value = response.data;
  } catch (error) {
    errorMessage.value = `Une erreur est survenue lors de la récupération de l'application. (${error})`;
  } finally {
    isLoading.value = false;
  }
}

onMounted(loadApplication);
</script>

<template>
  <div>
    <DsfrBreadcrumb />
    <div v-if="isLoading">Chargement...</div>
    <div v-else-if="errorMessage">
      {{ errorMessage }}
    </div>
    <div v-else-if="application && application.data">
      <h2>{{ currentLabel.label }}</h2>
      <ReportIssue class="button-right" :application="application.data" />
      <ApplicationOverview :application="application.data" @update:application="handleApplicationUpdate" />
    </div>
  </div>
</template>

<style scoped></style>
