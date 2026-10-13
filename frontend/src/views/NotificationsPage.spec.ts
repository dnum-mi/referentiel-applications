import Aura from "@primevue/themes/aura";
import PrimeVue from "primevue/config";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { reactive } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { NotificationType, type NotificationDto } from "@/client/types.gen";
import NotificationsPage from "./NotificationsPage.vue";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    notifications: [] as NotificationDto[],
    total: 0,
    unreadCount: 0,
    isLoading: false,
    fetchNotifications: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    deleteNotifications: vi.fn(),
  },
}));
const store = reactive(mocks);
vi.mock("@/stores/notificationStore", () => ({ useNotificationStore: () => store }));

function renderPage() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { template: "<div/>" } }] });
  return render(NotificationsPage, {
    global: {
      plugins: [router, [PrimeVue, { theme: { preset: Aura } }]],
      stubs: {
        DsfrModal: { props: { opened: Boolean }, template: '<section v-if="opened" role="dialog"><slot/><slot name="footer"/></section>' },
      },
    },
  });
}

beforeEach(() => {
  store.notifications = ["alpha", "beta"].map((id) => ({
    id,
    type: NotificationType.REPORT_CREATED,
    message: `Notification ${id}`,
    link: null,
    applicationId: null,
    createdAt: new Date("2026-10-13T09:00:00Z"),
    isRead: false,
  }));
  store.total = 2;
  store.unreadCount = 2;
  store.isLoading = false;
  store.fetchNotifications.mockReset().mockResolvedValue(undefined);
  store.markAllAsRead.mockReset().mockImplementation(async () => {
    store.unreadCount = 0;
    return true;
  });
  store.deleteNotification.mockReset().mockResolvedValue(false);
  store.deleteNotifications.mockReset().mockResolvedValue(false);
});
afterEach(cleanup);

describe("Notifications — commandes différées et contexte conservé", () => {
  it.each([false, true])("préserve ou restitue le focus après disparition du marquage (déplacement volontaire : %s)", async (moveFocus) => {
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
    renderPage();
    const button = screen.getByTestId("notifications-page-mark-all-read");
    button.focus();
    await fireEvent.click(button);
    await fireEvent.click(button);
    expect(store.markAllAsRead).toHaveBeenCalledTimes(1);
    expect(button).toHaveAttribute("aria-disabled", "true");
    const other = screen.getAllByTestId("notification-row-delete")[0];
    if (moveFocus) other.focus();
    finish();
    await waitFor(() => expect(screen.queryByTestId("notifications-page-mark-all-read")).not.toBeInTheDocument());
    await waitFor(() => expect(moveFocus ? other : screen.getByTestId("notifications-page-title")).toHaveFocus());
    expect(screen.getByTestId("notifications-operation-status")).toHaveTextContent("Toutes les notifications ont été marquées comme lues.");
  });

  it("conserve la sélection et le dialogue sur refus puis supprime exactement les mêmes notifications au réessai", async () => {
    let finish = () => {};
    store.deleteNotifications.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          finish = () => resolve(false);
        }),
    );
    renderPage();
    await fireEvent.click(await screen.findByRole("checkbox", { name: "Tout sélectionner" }));
    const selectionButton = screen.getByTestId("notifications-page-delete-selection");
    expect(selectionButton).toHaveTextContent("Supprimer la sélection (2)");
    selectionButton.focus();
    await fireEvent.click(selectionButton);
    const confirm = screen.getByTestId("delete-confirm-btn");
    confirm.focus();
    await fireEvent.click(confirm);
    await fireEvent.click(confirm);
    expect(store.deleteNotifications).toHaveBeenCalledTimes(1);
    finish();
    await waitFor(() =>
      expect(screen.getByTestId("delete-confirmation-error")).toHaveTextContent("Les notifications et votre sélection ont été conservées."),
    );
    expect(confirm).toHaveFocus();
    expect(selectionButton).toHaveTextContent("Supprimer la sélection (2)");
    expect(store.notifications).toHaveLength(2);
    store.deleteNotifications.mockImplementationOnce(async () => {
      store.notifications = [];
      store.total = 0;
      return true;
    });
    await fireEvent.click(confirm);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(store.deleteNotifications).toHaveBeenNthCalledWith(2, ["alpha", "beta"]);
    expect(screen.queryByTestId("notifications-page-delete-selection")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("notifications-page-title")).toHaveFocus());
    expect(screen.getByTestId("notifications-operation-status")).toHaveTextContent("2 notifications ont été supprimées.");
  });

  it.each([false, true])(
    "rejoint la ligne suivante ou préserve le focus choisi après suppression individuelle (déplacement : %s)",
    async (moveFocus) => {
      let finish = () => {};
      store.deleteNotification.mockImplementationOnce(
        () =>
          new Promise<boolean>((resolve) => {
            finish = () => {
              store.notifications = store.notifications.slice(1);
              resolve(true);
            };
          }),
      );
      renderPage();
      const first = screen.getAllByTestId("notification-row-delete")[0];
      first.focus();
      await fireEvent.click(first);
      const confirm = screen.getByTestId("delete-confirm-btn");
      confirm.focus();
      await fireEvent.click(confirm);
      const other = screen.getByTestId("notifications-page-mark-all-read");
      if (moveFocus) other.focus();
      finish();
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      await waitFor(() => expect(moveFocus ? other : screen.getAllByTestId("notification-row-delete")[0]).toHaveFocus());
      expect(store.deleteNotification).toHaveBeenCalledWith("alpha");
      expect(screen.getByTestId("notifications-operation-status")).toHaveTextContent("La notification a été supprimée.");
    },
  );
});
