import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { reactive } from "vue";
import { NotificationType, type EmailLogDto, type NotificationDto } from "@/client/types.gen";
import { routeNames } from "@/router/route-names";
import NotificationBell from "./NotificationBell.vue";

const { storeMock } = vi.hoisted(() => ({
  storeMock: {
    notifications: [] as NotificationDto[],
    unreadCount: 0,
    emailPreview: null as EmailLogDto | null,
    fetchNotifications: vi.fn(),
    fetchUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    openEmailPreview: vi.fn(),
    closeEmailPreview: vi.fn(),
  },
}));
const store = reactive(storeMock);

vi.mock("@/stores/notificationStore", () => ({
  useNotificationStore: () => store,
}));

const StubPage = { template: "<div/>" };

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { name: routeNames.NOTIFICATIONS, path: "/notifications", component: StubPage },
      { name: routeNames.ACCUEIL, path: "/", component: StubPage },
      { path: "/signalements", component: StubPage },
    ],
  });
}

function notificationFixture(overrides: Partial<NotificationDto> = {}): NotificationDto {
  return {
    id: "notif-1",
    type: NotificationType.REPORT_CREATED,
    message: "Nouveau signalement sur Portail Agent.",
    link: "/signalements",
    applicationId: null,
    isRead: false,
    createdAt: new Date().toISOString() as unknown as Date,
    ...overrides,
  };
}

describe("NotificationBell", () => {
  beforeEach(() => {
    storeMock.notifications = [];
    storeMock.unreadCount = 0;
    storeMock.emailPreview = null;
    storeMock.fetchNotifications.mockReset().mockResolvedValue(undefined);
    storeMock.fetchUnreadCount.mockReset().mockResolvedValue(undefined);
    storeMock.markAsRead.mockReset().mockResolvedValue(undefined);
    storeMock.markAllAsRead.mockReset().mockResolvedValue(undefined);
    storeMock.openEmailPreview.mockReset().mockResolvedValue(undefined);
    storeMock.closeEmailPreview.mockReset();
  });

  afterEach(cleanup);

  it("shows the unread count badge when there are unread notifications", () => {
    storeMock.unreadCount = 3;

    render(NotificationBell, { global: { plugins: [makeRouter()] } });

    expect(screen.getByTestId("notification-bell-badge")).toHaveTextContent("3");
  });

  it("hides the badge when there are no unread notifications", () => {
    storeMock.unreadCount = 0;

    render(NotificationBell, { global: { plugins: [makeRouter()] } });

    expect(screen.queryByTestId("notification-bell-badge")).not.toBeInTheDocument();
  });

  it("opens the panel and fetches the latest notifications on click", async () => {
    storeMock.notifications = [notificationFixture()];

    render(NotificationBell, { global: { plugins: [makeRouter()] } });

    expect(screen.queryByTestId("notification-bell-panel")).not.toBeInTheDocument();

    await fireEvent.click(screen.getByTestId("notification-bell-button"));

    await waitFor(() => expect(screen.getByTestId("notification-bell-panel")).toBeInTheDocument());
    expect(storeMock.fetchNotifications).toHaveBeenCalledWith(0, 10);
    expect(screen.getByText("Nouveau signalement sur Portail Agent.")).toBeInTheDocument();
  });

  it("marks all notifications as read when the action is used", async () => {
    storeMock.unreadCount = 2;
    storeMock.notifications = [notificationFixture()];

    render(NotificationBell, { global: { plugins: [makeRouter()] } });
    await fireEvent.click(screen.getByTestId("notification-bell-button"));
    await waitFor(() => screen.getByTestId("notification-mark-all-read"));

    await fireEvent.click(screen.getByTestId("notification-mark-all-read"));

    expect(storeMock.markAllAsRead).toHaveBeenCalled();
  });

  it.each([false, true])("conserve le panneau et le choix de focus après disparition du marquage (déplacement : %s)", async (moveFocus) => {
    store.unreadCount = 2;
    store.notifications = [notificationFixture()];
    let finish = () => {};
    store.markAllAsRead.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          finish = () => {
            store.unreadCount = 0;
            resolve(true);
          };
        }),
    );
    render(NotificationBell, { global: { plugins: [makeRouter()] } });
    const bell = screen.getByTestId("notification-bell-button");
    await fireEvent.click(bell);
    const mark = await screen.findByTestId("notification-mark-all-read");
    mark.focus();
    await fireEvent.click(mark);
    await fireEvent.click(mark);
    expect(store.markAllAsRead).toHaveBeenCalledTimes(1);
    expect(mark).toHaveAttribute("aria-disabled", "true");
    const history = screen.getByRole("button", { name: "Voir tout l'historique" });
    if (moveFocus) history.focus();
    finish();
    await waitFor(() => expect(screen.queryByTestId("notification-mark-all-read")).not.toBeInTheDocument());
    await waitFor(() => expect(moveFocus ? history : bell).toHaveFocus());
    expect(screen.getByTestId("notification-bell-panel")).toBeInTheDocument();
    expect(screen.getByTestId("notification-bell-operation-status")).toHaveTextContent(
      "Toutes les notifications ont été marquées comme lues.",
    );
  });

  it("marks a notification as read and navigates to its link when selected", async () => {
    storeMock.notifications = [notificationFixture()];

    render(NotificationBell, { global: { plugins: [makeRouter()] } });
    await fireEvent.click(screen.getByTestId("notification-bell-button"));
    await waitFor(() => screen.getByTestId("notification-item"));

    await fireEvent.click(screen.getByTestId("notification-item"));

    expect(storeMock.markAsRead).toHaveBeenCalledWith("notif-1");
    await waitFor(() => expect(screen.queryByTestId("notification-bell-panel")).not.toBeInTheDocument());
  });

  it("opens the e-mail preview instead of navigating when a notification has an associated e-mail", async () => {
    storeMock.notifications = [notificationFixture({ emailLogId: "email-log-1" })];

    render(NotificationBell, { global: { plugins: [makeRouter()] } });
    await fireEvent.click(screen.getByTestId("notification-bell-button"));
    await waitFor(() => screen.getByTestId("notification-item"));

    await fireEvent.click(screen.getByTestId("notification-item"));

    expect(storeMock.markAsRead).toHaveBeenCalledWith("notif-1");
    await waitFor(() => expect(storeMock.openEmailPreview).toHaveBeenCalledWith("notif-1"));
    expect(screen.getByTestId("notification-bell-button")).toHaveFocus();
  });

  it("expose l’e-mail comme un bouton et restaure le focus après Échap", async () => {
    storeMock.notifications = [notificationFixture({ emailLogId: "email-log-1" })];
    render(NotificationBell, { global: { plugins: [makeRouter()] } });
    const bell = screen.getByTestId("notification-bell-button");
    await fireEvent.click(bell);
    await waitFor(() => screen.getByTestId("notification-item"));
    expect(screen.getByTestId("notification-item").tagName).toBe("BUTTON");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    const email = screen.getByTestId("notification-item");
    email.focus();
    await fireEvent.keyDown(email, { key: "Escape" });
    await waitFor(() => expect(screen.queryByTestId("notification-bell-panel")).not.toBeInTheDocument());
    expect(bell).toHaveFocus();
  });
});
