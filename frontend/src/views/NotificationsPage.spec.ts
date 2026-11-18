import { DsfrSelect } from "@gouvminint/vue-dsfr";
import Aura from "@primevue/themes/aura";
import PrimeVue from "primevue/config";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { flushPromises } from "@vue/test-utils";
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
      components: { DsfrSelect },
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
  store.fetchNotifications.mockReset().mockResolvedValue(true);
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

describe("Notifications — statut non lu restitué sans la couleur ni le gras (RGAA 3.1)", () => {
  it("ajoute un texte masqué « Non lue » aux seules notifications non lues, avec ou sans lien", async () => {
    store.notifications = [
      { ...store.notifications[0], link: "/applications", isRead: false },
      { ...store.notifications[1], isRead: false },
      { ...store.notifications[0], id: "gamma", message: "Notification gamma", isRead: true },
    ];
    renderPage();
    const messages = await screen.findAllByTestId("notification-row-message");
    expect(messages[0]).toHaveAccessibleName("Notification alpha Non lue");
    expect(messages[1]).toHaveTextContent("Notification beta Non lue");
    expect(messages[2]).toHaveTextContent("Notification gamma");
    expect(messages[2]).not.toHaveTextContent("Non lue");
    expect(screen.getAllByText("Non lue")).toHaveLength(2);
    screen.getAllByText("Non lue").forEach((label) => expect(label).toHaveClass("fr-sr-only"));
  });
});

it("filtre par type, vide la sélection puis revient à Tous", async () => {
  renderPage();
  await fireEvent.click(await screen.findByRole("checkbox", { name: "Tout sélectionner" }));
  const select = screen.getByRole("combobox", { name: "Type d’événement" });
  await fireEvent.update(select, NotificationType.ACTOR_ADDED);
  expect(store.fetchNotifications).toHaveBeenLastCalledWith(0, 15, "desc", NotificationType.ACTOR_ADDED);
  expect(screen.queryByTestId("notifications-page-delete-selection")).not.toBeInTheDocument();
  store.notifications = [];
  await waitFor(() => expect(screen.getByText("Aucune notification pour ce type d’événement.")).toBeInTheDocument());
  expect(screen.getByText(/concerne toutes vos notifications/)).toBeInTheDocument();
  await fireEvent.update(select, "");
  expect(store.fetchNotifications).toHaveBeenLastCalledWith(0, 15, "desc", undefined);
});

describe("Notifications — annonce du résultat du filtrage", () => {
  it("annonce zéro résultat sans reprendre le focus et garde le message du tableau statique", async () => {
    renderPage();
    const status = screen.getByTestId("notifications-results-status");
    expect(status).toHaveAttribute("role", "status");
    expect(status).toHaveAttribute("aria-atomic", "true");
    await waitFor(() => expect(status).toHaveTextContent("2 notification(s)"));
    store.fetchNotifications.mockImplementationOnce(async () => {
      store.notifications = [];
      store.total = 0;
      return true;
    });
    const select = screen.getByRole("combobox", { name: "Type d’événement" });
    select.focus();
    await fireEvent.update(select, NotificationType.ACTOR_ADDED);
    await waitFor(() => expect(status).toHaveTextContent("0 notification(s)"));
    expect(screen.getByTestId("notifications-results-status")).toBe(status);
    expect(select).toHaveFocus();
    const empty = screen.getByText("Aucune notification pour ce type d’événement.");
    expect(empty.tagName).toBe("P");
    expect(empty.closest('output, [role="status"], [aria-live]')).toBeNull();
  });

  it("renouvelle l'annonce lorsque deux filtres successifs ne renvoient aucun résultat", async () => {
    store.notifications = [];
    store.total = 0;
    renderPage();
    const status = screen.getByTestId("notifications-results-status");
    await waitFor(() => expect(status).toHaveTextContent("0 notification(s)"));
    const select = screen.getByRole("combobox", { name: "Type d’événement" });
    for (const type of [NotificationType.ACTOR_ADDED, ""]) {
      let finish!: (result: boolean) => void;
      store.fetchNotifications.mockImplementationOnce(() => new Promise<boolean>((resolve) => (finish = resolve)));
      select.focus();
      await fireEvent.update(select, type);
      expect(status).toBeEmptyDOMElement();
      finish(true);
      await waitFor(() => expect(status).toHaveTextContent("0 notification(s)"));
      expect(select).toHaveFocus();
    }
    expect(screen.getByText("Vous n’avez aucune notification.")).toBeInTheDocument();
  });

  it("ne transforme pas une recherche refusée en annonce de résultats", async () => {
    renderPage();
    const status = screen.getByTestId("notifications-results-status");
    await waitFor(() => expect(status).toHaveTextContent("2 notification(s)"));
    store.fetchNotifications.mockResolvedValueOnce(false);
    const select = screen.getByRole("combobox", { name: "Type d’événement" });
    select.focus();
    await fireEvent.update(select, NotificationType.ACTOR_ADDED);
    expect(status).toBeEmptyDOMElement();
    expect(select).toHaveFocus();
    expect(store.notifications).toHaveLength(2);
  });

  it("attend la recherche la plus récente avant d'annoncer son résultat", async () => {
    renderPage();
    const status = screen.getByTestId("notifications-results-status");
    await waitFor(() => expect(status).toHaveTextContent("2 notification(s)"));
    let finishOld!: (result: boolean) => void;
    let finishLatest!: (result: boolean) => void;
    store.fetchNotifications
      .mockImplementationOnce(() => new Promise<boolean>((resolve) => (finishOld = resolve)))
      .mockImplementationOnce(() => new Promise<boolean>((resolve) => (finishLatest = resolve)));
    const select = screen.getByRole("combobox", { name: "Type d’événement" });
    select.focus();
    await fireEvent.update(select, NotificationType.ACTOR_ADDED);
    await fireEvent.update(select, NotificationType.REPORT_CREATED);
    finishOld(true);
    await flushPromises();
    expect(status).toBeEmptyDOMElement();
    store.notifications = [];
    store.total = 0;
    finishLatest(true);
    await waitFor(() => expect(status).toHaveTextContent("0 notification(s)"));
    expect(select).toHaveFocus();
  });
});

it("conserve le type pendant la pagination et le tri, puis revient en première page au changement de type", async () => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  store.total = 45;
  renderPage();
  const select = screen.getByRole("combobox", { name: "Type d’événement" });
  await fireEvent.update(select, NotificationType.ACTOR_ADDED);
  await fireEvent.click(screen.getByRole("button", { name: "Page suivante (page 2 sur 3)" }));
  expect(store.fetchNotifications).toHaveBeenLastCalledWith(1, 15, "desc", NotificationType.ACTOR_ADDED);
  await fireEvent.click(screen.getByRole("button", { name: "Date" }));
  expect(store.fetchNotifications).toHaveBeenLastCalledWith(0, 15, "asc", NotificationType.ACTOR_ADDED);
  await fireEvent.click(screen.getByRole("button", { name: "Page suivante (page 2 sur 3)" }));
  await fireEvent.update(select, NotificationType.REPORT_CREATED);
  expect(store.fetchNotifications).toHaveBeenLastCalledWith(0, 15, "asc", NotificationType.REPORT_CREATED);
});
