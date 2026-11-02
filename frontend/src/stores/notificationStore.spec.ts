import { createPinia, setActivePinia } from "pinia";
import { NotificationType, type NotificationDto } from "@/client/types.gen";
import { useNotificationStore } from "./notificationStore";

const { markAll, deleteOne, deleteMany, findAll, markOne, errorToast } = vi.hoisted(() => ({
  findAll: vi.fn(),
  markOne: vi.fn(),
  markAll: vi.fn(),
  deleteOne: vi.fn(),
  deleteMany: vi.fn(),
  errorToast: vi.fn(),
}));
vi.mock("@/api/index", () => ({
  default: {
    notificationControllerFindAll: findAll,
    notificationControllerMarkAsRead: markOne,
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
  for (const mock of [markAll, deleteOne, deleteMany, findAll, markOne, errorToast]) mock.mockReset();
  const store = useNotificationStore();
  store.notifications = structuredClone(notifications);
  store.bellNotifications = structuredClone(notifications);
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
    expect(store.bellNotifications.every((n) => n.isRead)).toBe(true);
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

describe("Filtrage des notifications", () => {
  it("transmet le type et garde la cloche et son compteur indépendants", async () => {
    const store = useNotificationStore();
    findAll.mockResolvedValueOnce({ data: { results: [notifications[0]], total: 1 } });
    await store.fetchNotifications(1, 2, "asc", NotificationType.REPORT_CREATED);
    expect(findAll).toHaveBeenLastCalledWith({
      query: { page: 1, pageSize: 2, sortBy: "createdAt", order: "asc", type: NotificationType.REPORT_CREATED },
    });
    findAll.mockResolvedValueOnce({ data: { results: [notifications[1]], total: 3 } });
    await store.fetchBellNotifications();
    expect(findAll).toHaveBeenLastCalledWith({ query: { page: 0, pageSize: 10, sortBy: "createdAt", order: "desc" } });
    expect(store.notifications).toEqual([notifications[0]]);
    expect(store.bellNotifications).toEqual([notifications[1]]);
    expect(store.total).toBe(1);
    expect(store.unreadCount).toBe(2);
  });

  it("ignore une ancienne réponse après le retour à Tous", async () => {
    const store = useNotificationStore();
    let finish!: (value: unknown) => void;
    findAll.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const old = store.fetchNotifications(0, 15, "desc", NotificationType.REPORT_CREATED);
    findAll.mockResolvedValueOnce({ data: { results: notifications, total: 3 } });
    await store.fetchNotifications();
    finish({ data: { results: [], total: 0 } });
    await old;
    expect(store.notifications).toEqual(notifications);
    expect(store.total).toBe(3);
    expect(store.isLoading).toBe(false);
    expect(findAll).toHaveBeenLastCalledWith({ query: { page: 0, pageSize: 15, sortBy: "createdAt", order: "desc", type: undefined } });
  });

  it("synchronise la lecture et la suppression dans les deux listes", async () => {
    const store = useNotificationStore();
    markOne.mockResolvedValue({ response: { ok: true } });
    await store.markAsRead("alpha");
    expect(store.notifications[0].isRead).toBe(true);
    expect(store.bellNotifications[0].isRead).toBe(true);
    expect(store.unreadCount).toBe(1);
    deleteOne.mockResolvedValue({ response: { ok: true } });
    await store.deleteNotification("alpha");
    expect(store.bellNotifications.map((n) => n.id)).toEqual(["beta", "gamma"]);
  });
});
