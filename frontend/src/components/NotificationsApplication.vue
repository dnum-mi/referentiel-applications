<script setup lang="ts">
import Issue from "@/api/reportIssue";
import type { Application } from "@/models/Application";
import { onMounted, ref } from "vue";
import { formatDate } from "@/composables/use-date";
import { statusDictionary, statusIconClasses } from "@/composables/use-dictionary";

const props = defineProps<{ application: Application }>();

const notifications = ref<any[]>([]);

const statuses = Object.keys(statusDictionary);

const currentPage = ref(0);

const headers = ["Notifié par", "Description", "Date de création", "Statut"];
const rows = ref<(string | { component: string; [k: string]: unknown })[][]>([]);

const loadNotifications = async () => {
  try {
    const notificationList = await Issue.getNotificationsByApplicationId(props.application.id);
    notifications.value = notificationList;

    notifications.value.forEach((notification) => {
      notification.statu = statuses[0];
    });

    rows.value = notificationList.map((report: any) => [
      report.notifier.email,
      { component: "div", class: "description-cell", content: report.description },
      formatDate(report.createdAt),
      {
        component: "DsfrTag",
        icon: statusIconClasses[report.status],
        label: statusDictionary[report.status],
        class: report.status,
      },
    ]);
  } catch (error) {
    console.error("Une erreur est survenue lors du chargement des notifications :", error);
  }
};

onMounted(() => {
  loadNotifications();
});
</script>

<template>
  <div v-if="rows.length === 0" class="text-center">
    <p>Aucun signalement enregistré.</p>
  </div>
  <DsfrDataTable
    v-else
    v-model:current-page="currentPage"
    :headers-row="headers"
    :rows="rows"
    row-key="id"
    title="Liste des notifications associées"
    pagination
    :rows-per-page="5"
    :pagination-options="[5, 10, 20, 30]"
    bottom-action-bar-class="bottom-action-bar-class"
    pagination-wrapper-class="pagination-wrapper-class"
    sorted="id"
    :sortable-rows="['id']"
  >
    <template #cell="{ colKey, cell }">
      <template v-if="colKey === 'Statut'">
        <DsfrTag :icon="cell.icon" :class="cell.class" :label="cell.label" />
      </template>
      <template v-else-if="colKey === 'Description'">
        <div :class="cell.class">{{ cell.content }}</div>
      </template>
      <template v-else>
        {{ cell }}
      </template>
    </template>
  </DsfrDataTable>
</template>

<style scoped>
:deep(.in_progress) {
  color: var(--info-425-625);
  background-color: var(--info-950-100);
}

:deep(.in_pending) {
  color: var(--error-425-625);
  background-color: var(--error-950-100);
}

:deep(.done) {
  color: var(--success-425-625);
  background-color: var(--success-950-100);
}

.fr-list {
  max-height: 400px;
  overflow-y: auto;
}

.fr-flex-container {
  display: flex;
  justify-content: center;
  position: sticky;
  bottom: 0;
  padding: 1rem;
  z-index: 10;
  width: 100%;
}

.bg-contrast-grey {
  background-color: #f0f0f0;
  border-radius: 8px;
  padding: 1rem;
}

.fr-text--sm {
  font-size: 0.875rem;
}

.text-grey-380 {
  color: #6c757d;
}

.fr-list--unstyled {
  list-style: none;
  padding-left: 0;
}

.fr-text--bold {
  font-weight: bold;
}

.description-content {
  margin-top: 0.5rem;
  padding-left: 1rem;
  border-left: 3px solid #dcdcdc;
}

.fr-actions-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: 0.5rem;
}

.fr-buttons-container {
  display: flex;
  gap: 0.5rem;
  min-height: 40px;
}

.fr-select {
  min-width: 150px;
}

.fr-grid-row--middle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}
/* Permet d'afficher les retours à la ligne et d'ajuster la hauteur */
.description-cell {
  white-space: pre-wrap; /* Garde les sauts de ligne */
  word-wrap: break-word; /* Coupe les mots longs */
  max-width: 300px; /* Ajuste selon ton besoin */
}
</style>
