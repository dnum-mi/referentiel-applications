import { cleanup, render, screen, waitFor } from "@testing-library/vue";
import { flushPromises } from "@vue/test-utils";
import { Roles } from "@/client/types.gen";
import AppPermsMatrixHistory from "./AppPermsMatrixHistory.vue";
import UserPermissionLogHistory from "./UserPermissionLogHistory.vue";
import UserConnexionLogHistory from "./UserConnexionLogHistory.vue";

const { matrixHistory, permissionLogs, connexionLogs } = vi.hoisted(() => ({
  matrixHistory: vi.fn(),
  permissionLogs: vi.fn(),
  connexionLogs: vi.fn(),
}));
vi.mock("@/api/index", () => ({
  default: {
    actorTypeControllerGetMatrixHistory: matrixHistory,
    userControllerFindPermissionLogs: permissionLogs,
    userControllerFindConnexionLogs: connexionLogs,
  },
}));
const global = {
  stubs: {
    AppLoader: { template: "<div>Chargement</div>" },
    RefAppTable: {
      props: ["items"],
      template: '<table><tbody><tr v-for="item in items" :key="item.id"><td>{{ item.id }}</td></tr></tbody></table>',
    },
  },
};
const cases = [
  {
    name: "matrice des permissions",
    apiMock: matrixHistory,
    render: () => render(AppPermsMatrixHistory, { global }),
    prefix: "app-perms-matrix-history",
    errorId: "app-perms-matrix-history-error",
    log: { id: "matrix-log", createdAt: new Date("2026-10-12T09:00:00Z"), description: "Permissions modifiées" },
  },
  {
    name: "permissions utilisateur",
    apiMock: permissionLogs,
    render: () => render(UserPermissionLogHistory, { props: { userId: "user-1" }, global }),
    prefix: "permission-log-history",
    errorId: "permission-log-history-error",
    log: { id: "permissions-log", createdAt: new Date("2026-10-12T09:00:00Z"), role: Roles.READER, additionalPermissions: [] },
  },
  {
    name: "connexions utilisateur",
    apiMock: connexionLogs,
    render: () => render(UserConnexionLogHistory, { props: { userId: "user-1" }, global }),
    prefix: "connexion-log-history",
    errorId: "connexion-log-history-error",
    log: {
      id: "connexion-log",
      authTime: new Date("2026-10-12T09:00:00Z"),
      authLevel: "strong",
      authMethod: null,
      authIdp: null,
      authSource: null,
    },
  },
];

beforeEach(() => {
  for (const { apiMock } of cases) apiMock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  document.querySelectorAll('[data-testid="history-focus-test-trigger"]').forEach((trigger) => trigger.remove());
  vi.restoreAllMocks();
});

describe.each(cases)("annonces de l’historique : $name", ({ apiMock, render: renderHistory, prefix, errorId, log }) => {
  it("annonce l’erreur tardive dans la région assertive existante, sans déplacer le focus ni afficher un historique vide", async () => {
    let resolve!: (response: { response: { ok: boolean } }) => void;
    apiMock.mockReturnValue(
      new Promise((resolvePromise) => {
        resolve = resolvePromise;
      }),
    );
    const trigger = document.createElement("button");
    trigger.dataset.testid = "history-focus-test-trigger";
    trigger.textContent = "Fermer l’historique";
    document.body.append(trigger);
    trigger.focus();
    renderHistory();
    const alert = screen.getByRole("alert");
    expect(alert).toBeEmptyDOMElement();
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(alert).toHaveAttribute("aria-atomic", "true");
    await waitFor(() => expect(screen.getByTestId(`${prefix}-loader`)).toBeInTheDocument());
    resolve({ response: { ok: false } });
    await waitFor(() => expect(screen.getByTestId(errorId)).toHaveTextContent("Erreur lors du chargement"));
    expect(screen.getByRole("alert")).toBe(alert);
    expect(trigger).toHaveFocus();
    expect(screen.queryByTestId(`${prefix}-empty`)).not.toBeInTheDocument();
    expect(screen.queryByTestId(`${prefix}-loader`)).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    trigger.remove();
  });

  it("conserve le message vide et une région d’erreur silencieuse après une lecture réussie", async () => {
    apiMock.mockResolvedValue({ response: { ok: true }, data: [] });
    renderHistory();
    await flushPromises();
    expect(screen.getByTestId(`${prefix}-empty`)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
    expect(screen.queryByTestId(`${prefix}-loader`)).not.toBeInTheDocument();
  });

  it("conserve le tableau et ses lignes après une lecture réussie", async () => {
    apiMock.mockResolvedValue({ response: { ok: true }, data: [log] });
    renderHistory();
    await flushPromises();
    expect(screen.getByRole("table")).toHaveTextContent(log.id);
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
    expect(screen.queryByTestId(`${prefix}-empty`)).not.toBeInTheDocument();
  });
});
