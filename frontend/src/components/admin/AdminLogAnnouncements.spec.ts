import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h, KeepAlive } from "vue";
import AdminActionLogsTab from "./AdminActionLogsTab.vue";
import AdminEmailLogsTab from "./AdminEmailLogsTab.vue";

const { actionLogs, emailLogs } = vi.hoisted(() => ({ actionLogs: vi.fn(), emailLogs: vi.fn() }));
vi.mock("@/api/index", () => ({ default: { actionLogControllerFindAll: actionLogs, emailControllerFindLogs: emailLogs } }));
enableAutoUnmount(afterEach);
beforeEach(() => {
  actionLogs.mockReset();
  emailLogs.mockReset();
});

const cases = [
  {
    name: "actions",
    component: AdminActionLogsTab,
    apiMock: actionLogs,
    errorId: "admin-action-logs-error",
    statusId: "admin-action-logs-status",
    loading: "Chargement du journal des actions…",
    message: "Erreur lors du chargement du journal des actions.",
    empty: "Aucune action journalisée.",
  },
  {
    name: "e-mails",
    component: AdminEmailLogsTab,
    apiMock: emailLogs,
    errorId: "admin-email-logs-error",
    statusId: "admin-email-logs-status",
    loading: "Chargement de l'historique des e-mails…",
    message: "Erreur lors du chargement de l'historique des e-mails.",
    empty: "Aucun e-mail envoyé pour le moment.",
  },
];

describe.each(cases)("Annonce du journal des $name", ({ component, apiMock, errorId, statusId, loading, message, empty }) => {
  function renderTab() {
    return mount(defineComponent({ setup: () => () => h(KeepAlive, null, [h(component)]) }), {
      attachTo: document.body,
      global: { stubs: { RefAppTable: true } },
    });
  }

  it("annonce le refus tardif dans une région existante sans reprendre le focus", async () => {
    let resolve!: (value: { response: { ok: false } }) => void;
    apiMock.mockReturnValue(new Promise((release) => (resolve = release)));
    const wrapper = renderTab();
    const alert = wrapper.get(`[data-testid="${errorId}"]`);
    expect(alert.element).toHaveAttribute("role", "alert");
    expect(alert.element).toHaveAttribute("aria-live", "assertive");
    expect(alert.element).toHaveAttribute("aria-atomic", "true");
    expect(alert.element).toBeEmptyDOMElement();
    expect(alert.element).not.toHaveClass("fr-alert");
    const destination = document.createElement("button");
    document.body.append(destination);
    destination.focus();
    resolve({ response: { ok: false } });
    await flushPromises();
    expect(wrapper.get(`[data-testid="${errorId}"]`).element).toBe(alert.element);
    expect(alert.text()).toBe(message);
    expect(destination).toHaveFocus();
    expect(wrapper.text()).not.toContain(empty);
    destination.remove();
  });

  it("garde la région silencieuse après une lecture vide réussie", async () => {
    apiMock.mockResolvedValue({ response: { ok: true }, data: { results: [], total: 0 } });
    const wrapper = renderTab();
    await flushPromises();
    const alert = wrapper.get(`[data-testid="${errorId}"]`);
    expect(alert.element).toBeEmptyDOMElement();
    expect(alert.element).not.toHaveClass("fr-alert");
    expect(wrapper.text()).toContain(empty);
  });

  it("annonce le chargement puis le résultat vide hors du tableau occupé", async () => {
    let resolve!: (value: { response: { ok: true }; data: { results: never[]; total: number } }) => void;
    apiMock.mockReturnValue(new Promise((release) => (resolve = release)));
    const wrapper = renderTab();
    await flushPromises();
    const status = wrapper.get(`[data-testid="${statusId}"]`);
    expect(status.element.tagName).toBe("OUTPUT");
    expect(status.element).toHaveAttribute("aria-live", "polite");
    expect(status.element).toHaveAttribute("aria-atomic", "true");
    expect(status.element.closest('[aria-busy="true"]')).toBeNull();
    expect(status.text()).toBe(loading);
    resolve({ response: { ok: true }, data: { results: [], total: 0 } });
    await flushPromises();
    expect(wrapper.get(`[data-testid="${statusId}"]`).element).toBe(status.element);
    expect(status.text()).toBe(empty);
    expect(wrapper.get(`[data-testid="${errorId}"]`).element).toBeEmptyDOMElement();
  });
});
