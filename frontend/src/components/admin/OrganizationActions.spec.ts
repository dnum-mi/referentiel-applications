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
  it("prévient que les admins scopés sur l'organisation deviendront admins globaux", async () => {
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
    expect(screen.getByText(/ils deviendront administrateurs globaux/)).toBeInTheDocument();
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

  it("n'ouvre pas la modale si les admins scopés ne peuvent pas être récupérés", async () => {
    findScopedAdminsMock.mockResolvedValue({ response: { ok: false, status: 403 } });
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
});
