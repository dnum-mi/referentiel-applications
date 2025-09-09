<script setup lang="ts">
import { useReportIssueStore } from "@/stores/reportIssueStore";
import { computed } from "vue";
import type { ApplicationWithPerms, Metadata } from "@/models/Application";
import { useUserStore } from "@/stores/userStore";
import { AdminLevel } from "@/models/user";
import { useMetadataStore } from "@/stores/metadataStore";

const props = defineProps<{ application: ApplicationWithPerms }>();

const reportStore = useReportIssueStore();
const metadataStore = useMetadataStore();

const headers = ["Date", "Auteur", "Description"];
const currentPage = ref(0);
const activeAccordion = ref<number>();
const userStore = useUserStore();

const canPost = computed(() => {
  return props.application.myPerms.has("postAnomalyNotifications")
    || userStore.adminLevel >= AdminLevel.WRITE;
});

function formatDescription(description: string): { title: string, content: string } {
  const oldMatch = description.match(/Ancienne\(s\) valeur\(s\):\s*(\{.*?\})/s);
  const newMatch = description.match(/Nouvelle\(s\) valeur\(s\):\s*(\{.*\})/s);

  const title = description.split("\n")[0];

  if (!oldMatch && !newMatch) {
    return { title, content: description };
  }

  try {
    let formatted = "";

    if (newMatch) {
      const newObj = JSON.parse(newMatch[1]);
      const newLine = Object.entries(newObj)
        .map(([k, v]) => `${k}='${Array.isArray(v) ? v.join(", ") : v}'`)
        .join(" ");
      formatted += `Nouvelle(s) valeur(s): ${newLine}\n`;
    }

    if (oldMatch) {
      const oldObj = JSON.parse(oldMatch[1]);
      const oldLine = Object.entries(oldObj)
        .map(([k, v]) => `${k}='${Array.isArray(v) ? v.join(", ") : v}'`)
        .join(" ");
      formatted += `Ancienne(s) valeur(s): ${oldLine}`;
    }

    return { title, content: formatted };
  } catch (_e) {
    return { title, content: description };
  }
}

const rows = computed(() => {
  const title = "Signalement";
  const reports = (reportStore.issues || []).map((report: any) => ({
    sortKey: new Date(report.createdAt).getTime(),
    Date: new Date(report.createdAt).toLocaleDateString("fr-FR"),
    Auteur: report.notifier.email,
    Description: { title, content: report.description || "" },
  }));

  const modifications = (metadataStore.metadatas || []).map((metadata: Metadata) => {
    const { title, content } = formatDescription(metadata.description || "");
    return {
      sortKey: new Date(metadata.createdAt).getTime(),
      Date: new Date(metadata.createdAt).toLocaleDateString("fr-FR"),
      Auteur: metadata.createdBy?.email || "Inconnu",
      Description: { title, content },
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
      title="Liste des corrections et modifications"
      pagination
      :rows-per-page="5"
      :pagination-options="[5, 10, 20, 30]"
      data-testid="notifications-table"
    >
      <template #cell="{ colKey, cell }">
        <template v-if="colKey === 'Description'">
          <DsfrAccordion :id="cell.index" :title="cell.title" data-testid="notifications-accordion">
            <div class="full-description">
              <pre class="formatted-description" data-testid="notifications-description">{{ cell.content }}</pre>
            </div>
          </DsfrAccordion>
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
