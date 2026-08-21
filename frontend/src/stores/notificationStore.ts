import type { EmailLogDto, NotificationDto } from "@/client/types.gen";
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index";
import { useToasterStore } from "@/stores/toasterStore";

export const useNotificationStore = defineStore("notificationStore", () => {
  const notifications = ref<NotificationDto[]>([]);
  const total = ref(0);
  const unreadCount = ref(0);
  const isLoading = ref(false);
  const emailPreview = ref<EmailLogDto | null>(null);

  async function fetchNotifications(page = 0, pageSize = 15, order: "asc" | "desc" = "desc") {
    isLoading.value = true;
    try {
      const response = await api.notificationControllerFindAll({
        query: { page, pageSize, sortBy: "createdAt", order },
      });
      if (response.data) {
        notifications.value = response.data.results;
        total.value = response.data.total;
      }
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchUnreadCount() {
    const response = await api.notificationControllerCountUnread();
    if (response.data) {
      unreadCount.value = response.data.count;
    }
  }

  async function markAsRead(id: string) {
    const toaster = useToasterStore();
    const notification = notifications.value.find((n) => n.id === id);
    if (notification?.isRead) {
      return;
    }
    try {
      const response = await api.notificationControllerMarkAsRead({ path: { id } });
      if (!response.response.ok) {
        throw new Error("Erreur lors du marquage de la notification comme lue");
      }
      if (notification) {
        notification.isRead = true;
      }
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    } catch {
      toaster.addErrorMessage("Erreur lors du marquage de la notification comme lue.");
    }
  }

  async function markAllAsRead() {
    const toaster = useToasterStore();
    try {
      const response = await api.notificationControllerMarkAllAsRead();
      if (!response.response.ok) {
        throw new Error("Erreur lors du marquage des notifications comme lues");
      }
      notifications.value = notifications.value.map((n) => ({ ...n, isRead: true }));
      unreadCount.value = 0;
    } catch {
      toaster.addErrorMessage("Erreur lors du marquage des notifications comme lues.");
    }
  }

  async function deleteNotification(id: string) {
    const toaster = useToasterStore();
    try {
      const response = await api.notificationControllerDelete({ path: { id } });
      if (!response.response.ok) {
        throw new Error("Erreur lors de la suppression de la notification");
      }
      const removed = notifications.value.find((n) => n.id === id);
      notifications.value = notifications.value.filter((n) => n.id !== id);
      total.value = Math.max(0, total.value - 1);
      if (removed && !removed.isRead) {
        unreadCount.value = Math.max(0, unreadCount.value - 1);
      }
    } catch {
      toaster.addErrorMessage("Erreur lors de la suppression de la notification.");
    }
  }

  async function deleteNotifications(ids: string[]) {
    const toaster = useToasterStore();
    try {
      const response = await api.notificationControllerDeleteMany({ body: { ids } });
      if (!response.response.ok) {
        throw new Error("Erreur lors de la suppression des notifications");
      }
      const idSet = new Set(ids);
      const removedUnreadCount = notifications.value.filter((n) => idSet.has(n.id) && !n.isRead).length;
      notifications.value = notifications.value.filter((n) => !idSet.has(n.id));
      total.value = Math.max(0, total.value - ids.length);
      unreadCount.value = Math.max(0, unreadCount.value - removedUnreadCount);
    } catch {
      toaster.addErrorMessage("Erreur lors de la suppression des notifications.");
    }
  }

  async function openEmailPreview(notificationId: string) {
    const toaster = useToasterStore();
    const response = await api.notificationControllerFindEmail({
      path: { id: notificationId },
    });
    if (response.data) {
      emailPreview.value = response.data;
    } else {
      toaster.addErrorMessage("Aucun e-mail n'est associé à cette notification.");
    }
  }

  function closeEmailPreview() {
    emailPreview.value = null;
  }

  return {
    notifications,
    total,
    unreadCount,
    isLoading,
    emailPreview,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteNotifications,
    openEmailPreview,
    closeEmailPreview,
  };
});
