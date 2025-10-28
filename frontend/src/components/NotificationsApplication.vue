<script setup lang="ts">
import { useReportIssueStore } from "@/stores/reportIssueStore";
import { computed } from "vue";
import type { ApplicationWithPerms } from "@/models/Application";
import { useUserStore } from "@/stores/userStore";
import { AdminLevel } from "@/models/user";
import { useMetadataStore } from "@/stores/metadataStore";
import { useRoute } from 'vue-router';
const route = useRoute();

const props = defineProps<{ application: ApplicationWithPerms }>();

const reportStore = useReportIssueStore();
const metadataStore = useMetadataStore();

const headers = ["Date", "Auteur", "Titre", "Actions"];
const currentPage = ref(0);
const activeAccordion = ref<number>();
const userStore = useUserStore();

const canPost = computed(() => {
  return props.application.myPerms.has("postAnomalyNotifications")
    || userStore.adminLevel >= AdminLevel.WRITE;
});


function getTitle(meta: any): string {
  return (meta.description || '').split('\n')[0];
}

const rows = computed(() => {
  const title = "Signalement";
  const reports = (reportStore.issues || []).map((report: any) => ({
    sortKey: new Date(report.createdAt).getTime(),
    Date: new Date(report.createdAt).toLocaleDateString("fr-FR"),
  Auteur: report.notifier.email,
  Titre: title,
  Actions: {
    id: report.id,
    isMetadata: false,
  },
  }));

  const modifications = (metadataStore.metadatas || []).map((metadata: Metadata) => {
    return {
      sortKey: new Date(metadata.createdAt).getTime(),
      Date: new Date(metadata.createdAt).toLocaleDateString("fr-FR"),
      Auteur: metadata.createdBy?.email || "Inconnu",
      Titre: getTitle(metadata),
      Actions: {
        id: metadata.id,
        isMetadata: true,
      },
    };
  });

  return [...reports, ...modifications].sort((a, b) => b.sortKey - a.sortKey).map((item, index) => ({ ...item, index }));
});

const loading = computed(() => reportStore.isLoading || metadataStore.isLoading);
</script>

<template>
  <AppLoader v-if="loading" data-testid="notifications-loader" />
  <div v-else-if="!loading && rows.length === 0" class="text-center" data-testid="notifications-empty">
    <p>Aucune correction proposée.</p>
  </div>

  <DsfrAccordionsGroup v-else v-model="activeAccordion">
    <DsfrDataTable
      v-model:current-page="currentPage"
      :headers-row="headers"
      :rows="rows"
      title="Liste des signalements et modifications"
      pagination
      :rows-per-page="5"
      :pagination-options="[5, 10, 20, 30]"
      data-testid="notifications-table"
    >
      <template #cell="{ colKey, cell }">
        <template v-if="colKey === 'Actions' && cell.isMetadata">
          <router-link
            :to="{ name: 'metadata-detail', params: { id: cell.id }, query: { from: route.fullPath } }"
            class="fr-btn fr-btn--secondary fr-btn--sm"
            data-testid="notifications-see-more-button"
          >
            Voir plus
          </router-link>
        </template>
        <template v-else>
          {{ cell }}
        </template>
      </template>
    </DsfrDataTable>
  </DsfrAccordionsGroup>
  <ReportIssue v-if="canPost" :application="application" data-testid="notifications-report-issue" />
</template>

<style scoped>
.full-description {
  white-space: pre-wrap;
  word-wrap: break-word;
  margin-top: 0.5rem;
}

.formatted-description {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
