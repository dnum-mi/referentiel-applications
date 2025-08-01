<script setup lang="ts">
import type { Application, ApplicationWithPerms } from "@/models/Application";
import ApplicationOverview from "@/components/ApplicationOverview.vue";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { formatDate } from "@/composables/use-date";
import { statusApplicationDictionary } from "@/composables/use-dictionary";
import { useApplicationStore } from "@/stores/applicationStore";
import { useMetadataStore } from "@/stores/metadataStore";

const applicationStore = useApplicationStore();
const metadataStore = useMetadataStore();
const route = useRoute();
const id = route.params.id as string;
const application = computed<ApplicationWithPerms>(() => applicationStore.applicationsById[id]);
const applicationUpdated = ref<Application | null>(null);
const isLoading = ref(false);
const errorMessage = ref("");

async function handleApplicationUpdate(updateData: Application) {
  applicationUpdated.value = updateData;
    if (application.value.myPerms.has("readMetadata")) {
  await metadataStore.getFirstAndLastMetadataByApplication(updateData.id);
    }
  }

async function loadApplication() {
  isLoading.value = true;
  try {
    await applicationStore.fetchApplication(id);
    if (application.value.myPerms.has("readMetadata")) {
      await metadataStore.getFirstAndLastMetadataByApplication(id);
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
        <p v-if="metadataStore.firstMetadata" class="subtitle">
          Date de création : {{ new Date(metadataStore.firstMetadata.createdAt).toLocaleDateString("fr-FR") || "inconnue" }} ({{
            metadataStore.firstMetadata.createdBy?.email
          }})
        </p>
        <p v-if="metadataStore.lastMetadata" class="subtitle">
          Dernière modification : {{ formatDate(metadataStore.lastMetadata.createdAt) || "inconnue" }} ({{ metadataStore.lastMetadata.createdBy?.email }})
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
