import { createPinia, setActivePinia } from "pinia";
import { NotificationType, type NotificationDto } from "@/client/types.gen";
import { useNotificationStore } from "./notificationStore";

const { markAll, deleteOne, deleteMany, errorToast } = vi.hoisted(() => ({
  markAll: vi.fn(),
  deleteOne: vi.fn(),
  deleteMany: vi.fn(),
  errorToast: vi.fn(),
}));
vi.mock("@/api/index", () => ({
  default: {
    notificationControllerMarkAllAsRead: markAll,
    notificationControllerDelete: deleteOne,
    notificationControllerDeleteMany: deleteMany,
  },
}));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage: errorToast }) }));

const notifications = ["alpha", "beta", "gamma"].map((id, index) => ({
  id,
  type: NotificationType.REPORT_CREATED,
  message: `Notification ${id}`,
  link: null,
  applicationId: null,
  createdAt: new Date("2026-10-13T09:00:00Z"),
  isRead: index === 2,
})) satisfies NotificationDto[];

beforeEach(() => {
  setActivePinia(createPinia());
  for (const mock of [markAll, deleteOne, deleteMany, errorToast]) mock.mockReset();
  const store = useNotificationStore();
  store.notifications = structuredClone(notifications);
  store.total = 3;
  store.unreadCount = 2;
});

describe("Notifications — résultat explicite et conservation sur refus", () => {
  it.each(["mark-all", "delete-one", "delete-many"] as const)(
    "signale l’échec de %s sans modifier les données ou compteurs",
    async (action) => {
      const store = useNotificationStore();
      const mock = action === "mark-all" ? markAll : action === "delete-one" ? deleteOne : deleteMany;
      mock.mockResolvedValue({ response: { ok: false }, error: "refus" });
      const result =
        action === "mark-all"
          ? await store.markAllAsRead()
          : action === "delete-one"
            ? await store.deleteNotification("alpha")
            : await store.deleteNotifications(["alpha", "gamma"]);
      expect(result).toBe(false);
      expect(store.notifications).toEqual(notifications);
      expect(store.total).toBe(3);
      expect(store.unreadCount).toBe(2);
      expect(errorToast).toHaveBeenCalledOnce();
    },
  );

  it("confirme le marquage de toutes les notifications, sans changer leur nombre", async () => {
    markAll.mockResolvedValue({ response: { ok: true } });
    const store = useNotificationStore();
    expect(await store.markAllAsRead()).toBe(true);
    expect(store.notifications.every((notification) => notification.isRead)).toBe(true);
    expect(store.total).toBe(3);
    expect(store.unreadCount).toBe(0);
  });

  it("confirme chaque suppression et ne retire du compteur que les notifications non lues", async () => {
    deleteOne.mockResolvedValue({ response: { ok: true } });
    deleteMany.mockResolvedValue({ response: { ok: true } });
    const store = useNotificationStore();
    expect(await store.deleteNotification("alpha")).toBe(true);
    expect(store.notifications.map((notification) => notification.id)).toEqual(["beta", "gamma"]);
    expect(store.total).toBe(2);
    expect(store.unreadCount).toBe(1);
    expect(await store.deleteNotifications(["beta", "gamma"])).toBe(true);
    expect(store.notifications).toEqual([]);
    expect(store.total).toBe(0);
    expect(store.unreadCount).toBe(0);
    expect(errorToast).not.toHaveBeenCalled();
  });
});
