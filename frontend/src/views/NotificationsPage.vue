<script setup lang="ts">
import type { NotificationDto } from "@/client/types.gen";
import type { TableColumn } from "@/types/table";
import type { DsfrDataTableHeaderCell } from "@gouvminint/vue-dsfr";
import type { DataTablePageEvent } from "primevue/datatable";
import type { TableSortEvent } from "@/types/table";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useNotificationStore } from "@/stores/notificationStore";
import { formatRelativeDate } from "@/composables/use-date";
import RefAppTable from "@/components/RefAppTable.vue";
import DeleteConfirmationModal from "@/components/modal/DeleteConfirmationModal.vue";

const router = useRouter();

const notificationStore = useNotificationStore();

const headers = [
  { key: "message", label: "Message" },
  { key: "createdAt", label: "Date" },
  { key: "actions", label: "Actions" },
] as const satisfies DsfrDataTableHeaderCell[];

const tableColumns: TableColumn[] = headers.map((h) => ({
  field: h.key,
  header: h.label,
  sortable: h.key === "createdAt",
}));

const currentPage = ref(0);
const itemsPerPage = ref(15);
const sortOrder = ref<1 | -1>(-1);
const selection = ref<NotificationDto[]>([]);

const isDeleteModalOpen = ref(false);
const pendingDeleteIds = ref<string[]>([]);
const pendingDeleteLabel = ref("");

async function load() {
  await notificationStore.fetchNotifications(currentPage.value, itemsPerPage.value, sortOrder.value === 1 ? "asc" : "desc");
  selection.value = [];
}

function onPage(event: DataTablePageEvent) {
  currentPage.value = event.page;
  itemsPerPage.value = event.rows;
  load();
}

function onSort(event: TableSortEvent) {
  sortOrder.value = event.sortOrder === 1 ? 1 : -1;
  currentPage.value = 0;
  load();
}

async function onNavigate(notification: NotificationDto) {
  if (!notification.isRead) {
    await notificationStore.markAsRead(notification.id);
  }
  if (notification.link) {
    await router.push(notification.link);
  }
}

async function onViewEmail(notification: NotificationDto) {
  if (!notification.isRead) {
    await notificationStore.markAsRead(notification.id);
  }
  await notificationStore.openEmailPreview(notification.id);
}

function requestDeleteOne(notification: NotificationDto) {
  pendingDeleteIds.value = [notification.id];
  pendingDeleteLabel.value = "cette notification";
  isDeleteModalOpen.value = true;
}

function requestDeleteSelection() {
  pendingDeleteIds.value = selection.value.map((n) => n.id);
  pendingDeleteLabel.value = `les ${selection.value.length} notifications sélectionnées`;
  isDeleteModalOpen.value = true;
}

async function confirmDelete() {
  isDeleteModalOpen.value = false;
  const ids = pendingDeleteIds.value;
  pendingDeleteIds.value = [];
  if (ids.length === 1) {
    await notificationStore.deleteNotification(ids[0]);
  } else if (ids.length > 1) {
    await notificationStore.deleteNotifications(ids);
  }
  selection.value = [];
}

function cancelDelete() {
  isDeleteModalOpen.value = false;
  pendingDeleteIds.value = [];
}

onMounted(load);
</script>

<template>
  <div class="fr-container--fluid fr-px-3w" data-testid="notifications-page">
    <div class="notifications-page__header">
      <h1 class="fr-h1" data-testid="notifications-page-title">Notifications</h1>
      <div class="notifications-page__header-actions">
        <button
          v-if="selection.length > 0"
          type="button"
          class="fr-btn fr-btn--secondary fr-icon-delete-line fr-btn--icon-left"
          data-testid="notifications-page-delete-selection"
          @click="requestDeleteSelection"
        >
          Supprimer la sélection ({{ selection.length }})
        </button>
        <button
          v-if="notificationStore.unreadCount > 0"
          type="button"
          class="fr-btn fr-btn--secondary"
          data-testid="notifications-page-mark-all-read"
          @click="notificationStore.markAllAsRead()"
        >
          Tout marquer comme lu
        </button>
      </div>
    </div>

    <RefAppTable
      v-model:selection="selection"
      :items="notificationStore.notifications"
      :columns="tableColumns"
      :paginator="true"
      :lazy="true"
      :rows="itemsPerPage"
      :first="currentPage * itemsPerPage"
      :total-records="notificationStore.total"
      :loading="notificationStore.isLoading"
      :sort-field="'createdAt'"
      :sort-order="sortOrder"
      selectable
      data-key="id"
      data-testid="notifications-table"
      empty-message="Vous n'avez aucune notification."
      @page="onPage"
      @sort="onSort"
    >
      <template #body-message="{ data: row }: { data: NotificationDto }">
        <button
          v-if="row.link"
          type="button"
          class="notifications-page__message-link"
          :class="{ 'notifications-page__message--unread': !row.isRead }"
          data-testid="notification-row-message"
          @click="onNavigate(row)"
        >
          {{ row.message }}
        </button>
        <span v-else :class="{ 'notifications-page__message--unread': !row.isRead }" data-testid="notification-row-message">
          {{ row.message }}
        </span>
        <span v-if="row.emailLogId" class="notifications-page__email-hint">
          <span class="fr-icon-mail-line" aria-hidden="true" /> E-mail disponible
        </span>
      </template>

      <template #body-createdAt="{ data: row }: { data: NotificationDto }">
        {{ formatRelativeDate(row.createdAt) }}
      </template>

      <template #body-actions="{ data: row }: { data: NotificationDto }">
        <div class="notifications-page__row-actions">
          <button
            v-if="row.emailLogId"
            type="button"
            class="fr-btn fr-btn--tertiary fr-btn--sm fr-icon-mail-line fr-btn--icon-left"
            title="Voir l'e-mail"
            data-testid="notification-row-view"
            @click="onViewEmail(row)"
          >
            Voir l'e-mail
          </button>
          <button
            v-if="!row.isRead"
            type="button"
            class="fr-btn fr-btn--tertiary fr-btn--sm fr-icon-check-line fr-btn--icon-left"
            title="Marquer comme lu"
            data-testid="notification-row-mark-read"
            @click="notificationStore.markAsRead(row.id)"
          >
            Marquer comme lu
          </button>
          <button
            type="button"
            class="fr-btn fr-btn--tertiary fr-btn--sm fr-icon-delete-line fr-btn--icon-left"
            title="Supprimer"
            data-testid="notification-row-delete"
            @click="requestDeleteOne(row)"
          >
            Supprimer
          </button>
        </div>
      </template>
    </RefAppTable>

    <DeleteConfirmationModal
      :opened="isDeleteModalOpen"
      :item-name="pendingDeleteLabel"
      data-testid="notifications-delete-modal"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.notifications-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.notifications-page__header-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.notifications-page__message-link {
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  color: var(--text-action-high-blue-france);
  text-decoration: underline;
  cursor: pointer;
  text-align: left;
}

.notifications-page__message-link:hover {
  text-decoration-thickness: 2px;
}

.notifications-page__message--unread {
  font-weight: bold;
}

.notifications-page__email-hint {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  font-style: italic;
  color: var(--text-mention-grey);
}

.notifications-page__row-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
