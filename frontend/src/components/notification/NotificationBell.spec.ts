import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { createMemoryHistory, createRouter } from "vue-router";
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

vi.mock("@/stores/notificationStore", () => ({
  useNotificationStore: () => storeMock,
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
    expect(storeMock.openEmailPreview).toHaveBeenCalledWith("notif-1");
  });
});
