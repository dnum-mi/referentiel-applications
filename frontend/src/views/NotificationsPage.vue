<script setup lang="ts">
import type { NotificationDto } from "@/client/types.gen";
import type { TableColumn } from "@/types/table";
import type { DsfrDataTableHeaderCell } from "@gouvminint/vue-dsfr";
import type { DataTablePageEvent } from "primevue/datatable";
import type { TableSortEvent } from "@/types/table";
import { nextTick, onMounted, ref } from "vue";
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
const isDeleting = ref(false);
const deleteError = ref("");
const isMarkingAllAsRead = ref(false);
const operationStatus = ref("");
const pageTitle = ref<HTMLElement | null>(null);
const notificationTable = ref<{ $el?: HTMLElement } | null>(null);
let deleteTrigger: Element | null = null;
let deleteIndex = 0;

async function focusAfterOperation(origin: Element | null, target: HTMLElement | null, trigger?: Element | null) {
  await nextTick();
  if (document.activeElement === document.body || document.activeElement === origin || document.activeElement === trigger) {
    target?.focus();
  }
}

async function markAllAsRead() {
  if (isMarkingAllAsRead.value) return;
  const focusOrigin = document.activeElement;
  isMarkingAllAsRead.value = true;
  operationStatus.value = "Marquage des notifications en cours…";
  const succeeded = await notificationStore.markAllAsRead();
  isMarkingAllAsRead.value = false;
  operationStatus.value = succeeded ? "Toutes les notifications ont été marquées comme lues." : "";
  if (succeeded) await focusAfterOperation(focusOrigin, pageTitle.value);
}

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
  if (isDeleting.value) return;
  deleteTrigger = document.activeElement;
  deleteIndex = notificationStore.notifications.findIndex((item) => item.id === notification.id);
  deleteError.value = "";
  pendingDeleteIds.value = [notification.id];
  pendingDeleteLabel.value = "cette notification";
  isDeleteModalOpen.value = true;
}

function requestDeleteSelection() {
  if (isDeleting.value || selection.value.length === 0) return;
  deleteTrigger = document.activeElement;
  deleteIndex = 0;
  deleteError.value = "";
  pendingDeleteIds.value = selection.value.map((n) => n.id);
  pendingDeleteLabel.value = `les ${selection.value.length} notifications sélectionnées`;
  isDeleteModalOpen.value = true;
}

async function confirmDelete() {
  if (isDeleting.value || pendingDeleteIds.value.length === 0) return;
  const focusOrigin = document.activeElement;
  const trigger = deleteTrigger;
  const ids = [...pendingDeleteIds.value];
  isDeleting.value = true;
  deleteError.value = "";
  operationStatus.value = "Suppression des notifications en cours…";
  const succeeded =
    ids.length === 1 ? await notificationStore.deleteNotification(ids[0]) : await notificationStore.deleteNotifications(ids);
  isDeleting.value = false;
  if (!succeeded) {
    operationStatus.value = "";
    deleteError.value = "La suppression a échoué. Les notifications et votre sélection ont été conservées. Veuillez réessayer.";
    return;
  }
  isDeleteModalOpen.value = false;
  pendingDeleteIds.value = [];
  selection.value = selection.value.filter((notification) => !ids.includes(notification.id));
  operationStatus.value = ids.length === 1 ? "La notification a été supprimée." : `${ids.length} notifications ont été supprimées.`;
  await nextTick();
  const buttons = notificationTable.value?.$el?.querySelectorAll<HTMLButtonElement>('[data-testid="notification-row-delete"]');
  const nextButton = buttons?.[deleteIndex] ?? (buttons?.length ? buttons[buttons.length - 1] : null);
  await focusAfterOperation(focusOrigin, nextButton ?? pageTitle.value, trigger);
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
      <h1 ref="pageTitle" class="fr-h1" tabindex="-1" data-testid="notifications-page-title">Notifications</h1>
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
          :aria-disabled="isMarkingAllAsRead"
          :aria-busy="isMarkingAllAsRead"
          @click="markAllAsRead"
        >
          Tout marquer comme lu
        </button>
      </div>
    </div>
    <output aria-live="polite" aria-atomic="true" class="fr-sr-only" data-testid="notifications-operation-status">{{
      operationStatus
    }}</output>

    <RefAppTable
      ref="notificationTable"
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
          <span v-if="!row.isRead" class="fr-sr-only">Non lue</span>
        </button>
        <span v-else :class="{ 'notifications-page__message--unread': !row.isRead }" data-testid="notification-row-message">
          {{ row.message }}
          <span v-if="!row.isRead" class="fr-sr-only">Non lue</span>
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
      :is-submitting="isDeleting"
      :error-message="deleteError"
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
