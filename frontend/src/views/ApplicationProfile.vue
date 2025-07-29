<script setup lang="ts">
import type { Application, ApplicationWithPerms, Metadata } from "@/models/Application";
import Applications from "@/api/application";
import ApplicationOverview from "@/components/ApplicationOverview.vue";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { formatDate } from "@/composables/use-date";
import { statusApplicationDictionary } from "@/composables/use-dictionary";
import { useApplicationStore } from "@/stores/applicationStore";

const applicationStore = useApplicationStore();
const route = useRoute();
const id = route.params.id as string;
const application = computed<ApplicationWithPerms>(() => applicationStore.applicationsById[id]);
const applicationUpdated = ref<Application | null>(null);
const metadata = ref<Metadata | null>();
const firstMetadata = ref<Metadata | null>();
const isLoading = ref(false);
const errorMessage = ref("");

async function getMetadata(applicationId: string, order: "asc" | "desc") {
  const result = await Applications.getSortedMetadata(applicationId, order);
  return result[0] ?? null;
}

async function handleApplicationUpdate(updateData: Application) {
  applicationUpdated.value = updateData;
  metadata.value = await getMetadata(updateData.id, "desc");
}

async function loadApplication() {
  isLoading.value = true;
  try {
    await applicationStore.fetchApplication(id);
    if (application.value.myPerms.has("readMetadata")) {
      firstMetadata.value = await getMetadata(id, "asc");
      metadata.value = await getMetadata(id, "desc");
    }
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
    <div v-else-if="application">
      <h2 class="fr-mt-4w fr-ml-4w">
        {{ application.label }}
        <p v-if="firstMetadata" class="subtitle">
          Date de création : {{ new Date(firstMetadata.createdAt).toLocaleDateString("fr-FR") || "inconnue" }} ({{
            firstMetadata.createdBy?.email
          }})
        </p>
        <p v-if="metadata" class="subtitle">
          Dernière modification : {{ formatDate(metadata.createdAt) || "inconnue" }} ({{ metadata.createdBy?.email }})
        </p>
        <DsfrTag v-if="application.status" class="fr-mr-2w" :label="statusApplicationDictionary[application.status]" />
        <DsfrTag :label="`IQ: ${application.quality ?? 'non renseigné'}%`" />
      </h2>
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
