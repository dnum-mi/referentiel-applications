import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import type { OrganizationDto } from "@/client/types.gen";
import OrganizationActions from "./OrganizationActions.vue";

const { findScopedAdminsMock, deleteMock, addSuccessMessage, addErrorMessage } = vi.hoisted(() => ({
  findScopedAdminsMock: vi.fn(),
  deleteMock: vi.fn(),
  addSuccessMessage: vi.fn(),
  addErrorMessage: vi.fn(),
}));

vi.mock("@/api", () => ({
  default: {
    organizationsControllerFindScopedAdmins: findScopedAdminsMock,
    organizationsControllerDelete: deleteMock,
  },
}));
vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addSuccessMessage, addErrorMessage }),
}));

const organization = {
  id: "org-1",
  path: "MI/DNUM",
} as OrganizationDto;

function renderActions() {
  return render(OrganizationActions, {
    props: { organization },
    global: {
      stubs: {
        DsfrModal: {
          props: { opened: Boolean },
          template: '<div v-if="opened"><slot /><slot name="footer" /></div>',
        },
      },
    },
  });
}

const openDeleteModal = () => fireEvent.click(screen.getByTestId("admin-organization-delete-btn"));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("organizationActions — suppression", () => {
  it("exige la réaffectation des périmètres avant la suppression", async () => {
    findScopedAdminsMock.mockResolvedValue({
      response: { ok: true, status: 200 },
      data: [
        { id: "u-1", email: "alice@interieur.gouv.fr" },
        { id: "u-2", email: "bob@interieur.gouv.fr" },
      ],
    });
    renderActions();

    await openDeleteModal();

    await waitFor(() => expect(screen.getByTestId("organization-delete-scoped-admins-alert")).toBeInTheDocument());
    expect(findScopedAdminsMock).toHaveBeenCalledExactlyOnceWith({ path: { id: "org-1" } });
    expect(screen.getByText(/Réaffectez leur périmètre à une autre organisation/)).toBeInTheDocument();
    expect(screen.getByTestId("admin-delete-confirm-btn")).toBeDisabled();
    expect(deleteMock).not.toHaveBeenCalled();
    expect(screen.getAllByTestId("organization-delete-scoped-admin-item").map((item) => item.textContent?.trim())).toEqual([
      "alice@interieur.gouv.fr",
      "bob@interieur.gouv.fr",
    ]);
  });

  it("n'affiche pas d'avertissement quand aucun admin n'a l'organisation pour périmètre", async () => {
    findScopedAdminsMock.mockResolvedValue({ response: { ok: true, status: 200 }, data: [] });
    renderActions();

    await openDeleteModal();

    await waitFor(() => expect(screen.getByTestId("organization-delete-alert")).toBeInTheDocument());
    expect(screen.queryByTestId("organization-delete-scoped-admins-alert")).not.toBeInTheDocument();
  });

  it.each([
    { failure: "HTTP 403", response: { ok: false, status: 403 }, error: undefined },
    { failure: "réseau sans réponse", response: undefined, error: new TypeError("Failed to fetch") },
    { failure: "décodage après HTTP 200", response: { ok: true, status: 200 }, error: new SyntaxError("Invalid JSON") },
  ])("n'ouvre pas la modale après un échec $failure", async ({ response, error }) => {
    findScopedAdminsMock.mockResolvedValue({ response, error });
    renderActions();

    await openDeleteModal();

    await waitFor(() =>
      expect(addErrorMessage).toHaveBeenCalledWith("Erreur lors de la récupération des administrateurs de l'organisation"),
    );
    expect(screen.queryByTestId("organization-delete-alert")).not.toBeInTheDocument();
  });

  it("affiche un message dédié quand la suppression est refusée (403)", async () => {
    findScopedAdminsMock.mockResolvedValue({ response: { ok: true, status: 200 }, data: [] });
    deleteMock.mockResolvedValue({ response: { ok: false, status: 403 } });
    renderActions();

    await openDeleteModal();
    await fireEvent.click(await screen.findByTestId("admin-delete-confirm-btn"));

    await waitFor(() => expect(addErrorMessage).toHaveBeenCalledWith("Seul un administrateur global peut supprimer une organisation"));
  });

  it("relaie le refus 409 quand un périmètre est utilisé sans administrateur listé", async () => {
    const message = "Cette organisation définit le périmètre d'utilisateurs : réaffectez leur périmètre avant de la supprimer.";
    findScopedAdminsMock.mockResolvedValue({ response: { ok: true, status: 200 }, data: [] });
    deleteMock.mockResolvedValue({ response: { ok: false, status: 409 }, error: { message } });
    renderActions();

    await openDeleteModal();
    await fireEvent.click(await screen.findByTestId("admin-delete-confirm-btn"));

    await waitFor(() => expect(addErrorMessage).toHaveBeenCalledWith(message));
    expect(addSuccessMessage).not.toHaveBeenCalled();
    expect(screen.getByTestId("organization-delete-alert")).toBeInTheDocument();
  });

  it("conserve la modale et signale une suppression sans réponse HTTP", async () => {
    findScopedAdminsMock.mockResolvedValue({ response: { ok: true, status: 200 }, data: [] });
    deleteMock.mockResolvedValue({ error: new TypeError("Failed to fetch") });
    renderActions();

    await openDeleteModal();
    await fireEvent.click(await screen.findByTestId("admin-delete-confirm-btn"));

    await waitFor(() => expect(addErrorMessage).toHaveBeenCalledWith("Erreur lors de la suppression de l'organisation"));
    expect(addSuccessMessage).not.toHaveBeenCalled();
    expect(screen.getByTestId("organization-delete-alert")).toBeInTheDocument();
  });
});
