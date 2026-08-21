<script setup lang="ts">
import type { NotificationDto } from "@/client/types.gen";
import { computed, ref } from "vue";
import { onClickOutside } from "@vueuse/core";
import { useRouter } from "vue-router";
import { useNotificationStore } from "@/stores/notificationStore";
import { routeNames } from "@/router/route-names";
import NotificationListItem from "./NotificationListItem.vue";

const router = useRouter();
const notificationStore = useNotificationStore();

const isOpen = ref(false);
const panelRef = ref<HTMLElement | null>(null);
const buttonRef = ref<HTMLElement | null>(null);

onClickOutside(
  panelRef,
  () => {
    isOpen.value = false;
  },
  { ignore: [buttonRef] },
);

const badgeLabel = computed(() => (notificationStore.unreadCount > 99 ? "99+" : String(notificationStore.unreadCount)));

const buttonLabel = computed(() =>
  notificationStore.unreadCount > 0
    ? `Notifications, ${notificationStore.unreadCount} non lue${notificationStore.unreadCount > 1 ? "s" : ""}`
    : "Notifications",
);

async function togglePanel() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    await notificationStore.fetchNotifications(0, 10);
  }
}

async function onSelect(notification: NotificationDto) {
  isOpen.value = false;
  await notificationStore.markAsRead(notification.id);
  if (notification.emailLogId) {
    await notificationStore.openEmailPreview(notification.id);
  } else if (notification.link) {
    await router.push(notification.link);
  }
}

async function onMarkAllAsRead() {
  await notificationStore.markAllAsRead();
}

async function goToHistory() {
  isOpen.value = false;
  await router.push({ name: routeNames.NOTIFICATIONS });
}
</script>

<template>
  <div class="notification-bell">
    <button
      ref="buttonRef"
      type="button"
      class="fr-btn fr-btn--tertiary-no-outline fr-icon-notification-3-line notification-bell__button"
      :aria-label="buttonLabel"
      :aria-expanded="isOpen"
      data-testid="notification-bell-button"
      @click="togglePanel"
    >
      <span
        v-if="notificationStore.unreadCount > 0"
        class="notification-bell__badge"
        data-testid="notification-bell-badge"
        aria-hidden="true"
      >
        {{ badgeLabel }}
      </span>
    </button>

    <div v-if="isOpen" ref="panelRef" class="notification-bell__panel" role="menu" data-testid="notification-bell-panel">
      <div class="notification-bell__header fr-p-2w">
        <span class="fr-text--bold fr-mb-0">Notifications</span>
        <button
          v-if="notificationStore.unreadCount > 0"
          type="button"
          class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
          data-testid="notification-mark-all-read"
          @click="onMarkAllAsRead"
        >
          Tout marquer comme lu
        </button>
      </div>

      <div class="notification-bell__list">
        <p v-if="notificationStore.notifications.length === 0" class="fr-p-2w fr-text--sm">Aucune notification.</p>
        <NotificationListItem
          v-for="notification in notificationStore.notifications"
          :key="notification.id"
          :notification="notification"
          @select="onSelect"
        />
      </div>

      <div class="notification-bell__footer fr-p-2w">
        <button type="button" class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm" @click="goToHistory">Voir tout l'historique</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notification-bell {
  position: relative;
}

.notification-bell__button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* DSFR réserve un margin-right sur l'icône des boutons `fr-icon-*` pour laisser la place à un
   libellé — ce bouton n'en a pas (icône seule), ce qui décentre visuellement l'icône. */
.notification-bell__button::before {
  margin-right: 0 !important;
}

.notification-bell__badge {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.25rem;
  border-radius: 999px;
  background-color: var(--background-flat-error);
  color: var(--text-inverted-grey);
  font-size: 0.65rem;
  font-weight: bold;
  line-height: 1.1rem;
  text-align: center;
}

.notification-bell__panel {
  position: absolute;
  right: 0;
  z-index: 100;
  width: 22rem;
  max-width: 90vw;
  background-color: var(--background-default-grey);
  border: 1px solid var(--border-default-grey);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.notification-bell__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-default-grey);
}

.notification-bell__list {
  max-height: 24rem;
  overflow-y: auto;
}

.notification-bell__footer {
  display: flex;
  justify-content: center;
  border-top: 1px solid var(--border-default-grey);
}
</style>
