import { onUnmounted, watch } from "vue";
import { useNotificationStore } from "@/stores/notificationStore";
import { useUserStore } from "@/stores/userStore";

export const NOTIFICATIONS_POLLING_INTERVAL_MS = 30_000;

let pollingTimer: ReturnType<typeof setInterval> | undefined;

async function refreshUnreadCount(): Promise<void> {
  try {
    await useNotificationStore().fetchUnreadCount();
  } catch {
    // Le compteur reste inchangé en cas d'indisponibilité réseau ; la tentative suivante corrigera.
  }
}

function startPolling(): void {
  if (pollingTimer) return;
  void refreshUnreadCount();
  pollingTimer = setInterval(() => {
    void refreshUnreadCount();
  }, NOTIFICATIONS_POLLING_INTERVAL_MS);
}

function stopPolling(): void {
  if (!pollingTimer) return;
  clearInterval(pollingTimer);
  pollingTimer = undefined;
}

export function useNotificationPolling() {
  const userStore = useUserStore();

  watch(
    () => userStore.authenticated,
    (authenticated) => {
      if (authenticated) {
        startPolling();
      } else {
        stopPolling();
      }
    },
    { immediate: true },
  );

  onUnmounted(stopPolling);
}
