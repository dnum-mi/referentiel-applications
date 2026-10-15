import Aura from "@primevue/themes/aura";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/vue";
import PrimeVue from "primevue/config";
import type { CreateServiceTokenDto, ExposedTokenDto, ServiceTokenMode, TokenDto } from "@/client/types.gen";
import AdminTokensTab from "./AdminTokensTab.vue";

const { listMock, createMock, deleteMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  createMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("@/api", () => ({
  default: {
    tokenControllerList: listMock,
    tokenControllerCreateService: createMock,
    tokenControllerDelete: deleteMock,
  },
}));

const tokenFixture = {
  id: "service-token",
  kind: "service",
  serviceMode: "delegated",
  name: "Outil tiers",
  description: "Accès au référentiel",
  role: "VISITOR",
  status: "active",
  expiresAt: "2027-01-01",
  createdBy: { id: "admin", email: "admin@example.gouv.fr" },
} satisfies TokenDto;

function renderTab() {
  return render(AdminTokensTab, {
    global: {
      plugins: [[PrimeVue, { theme: { preset: Aura } }]],
      stubs: {
        OrganizationSearchSelect: true,
        DsfrModal: {
          props: { opened: Boolean },
          template: '<div v-if="opened"><slot /><slot name="footer" /></div>',
        },
      },
    },
  });
}

async function openCreateForm() {
  await fireEvent.click(screen.getByRole("button", { name: "Créer un token applicatif" }));
}

async function fillRequiredFields() {
  await fireEvent.update(screen.getByRole("textbox", { name: /^Nom/ }), tokenFixture.name);
  await fireEvent.update(screen.getByRole("textbox", { name: /^Description/ }), tokenFixture.description);
  await fireEvent.update(screen.getByLabelText(/^Date d'expiration/), tokenFixture.expiresAt);
}

beforeEach(() => {
  // Le paginateur écoute les changements d’orientation.
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  listMock.mockReset().mockResolvedValue({ data: { results: [], total: 0 } });
  deleteMock.mockReset();
  createMock.mockReset().mockImplementation(({ body }: { body: CreateServiceTokenDto }) => {
    const token: ExposedTokenDto = {
      ...tokenFixture,
      name: body.name,
      description: body.description,
      role: body.role,
      expiresAt: body.expiresAt,
      serviceMode: body.serviceMode ?? "machine",
      password: "new-service-token-secret",
    };
    return Promise.resolve({ data: token });
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AdminTokensTab : modes des tokens applicatifs", () => {
  it("rejoint le mode du formulaire puis rend le focus à Créer après annulation", async () => {
    renderTab();
    await openCreateForm();
    expect(screen.getByRole("radio", { name: /Au nom d’un utilisateur/ })).toHaveFocus();
    const cancel = screen.getByRole("button", { name: "Annuler" });
    cancel.focus();
    await fireEvent.click(cancel);
    await waitFor(() => expect(screen.getByTestId("admin-token-create-btn")).toHaveFocus());
  });

  it("conserve la saisie et la commande sur échec, bloque le doublon puis rejoint Copier au succès", async () => {
    let fail = () => {};
    createMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          fail = () => resolve({ error: { message: "Indisponible" } });
        }),
    );
    renderTab();
    await openCreateForm();
    await fillRequiredFields();
    const submit = screen.getByRole("button", { name: "Créer le token" });
    submit.focus();
    await fireEvent.click(submit);
    expect(submit).toHaveAttribute("aria-disabled", "true");
    expect(submit).toHaveFocus();
    await fireEvent.click(submit);
    expect(createMock).toHaveBeenCalledTimes(1);
    fail();
    await waitFor(() => expect(screen.getAllByRole("alert").some((alert) => alert.textContent?.includes("Indisponible"))).toBe(true));
    expect(submit).toHaveFocus();
    expect(screen.getByRole("textbox", { name: /^Nom/ })).toHaveValue(tokenFixture.name);
    await fireEvent.click(submit);
    await waitFor(() => expect(screen.getByTestId("admin-token-copy-btn")).toHaveFocus());
    expect(screen.getAllByRole("status").some((status) => status.textContent?.includes("Token applicatif créé avec succès"))).toBe(true);
  });
  it("préserve le focus déplacé vers une autre commande pendant une création lente", async () => {
    let finish = () => {};
    createMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ data: { ...tokenFixture, password: "synthetic-token" } });
        }),
    );
    renderTab();
    await openCreateForm();
    await fillRequiredFields();
    const submit = screen.getByRole("button", { name: "Créer le token" });
    submit.focus();
    await fireEvent.click(submit);
    const otherCommand = document.createElement("button");
    document.body.append(otherCommand);
    try {
      otherCommand.focus();
      finish();
      await screen.findByTestId("admin-token-copy-btn");
      await waitFor(() => expect(submit).not.toBeInTheDocument());
      expect(otherCommand).toHaveFocus();
    } finally {
      otherCommand.remove();
    }
  });
  it.each(["success", "error"])("préserve le focus déplacé pendant une révocation lente (%s)", async (outcome) => {
    listMock.mockImplementation(({ query }: { query: { kind: string } }) =>
      Promise.resolve({ data: { results: query.kind === "service" ? [tokenFixture] : [], total: query.kind === "service" ? 1 : 0 } }),
    );
    let finish = () => {};
    deleteMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () => resolve(outcome === "success" ? { data: {} } : { error: { message: "Indisponible" } });
        }),
    );
    renderTab();
    await fireEvent.click(await screen.findByRole("button", { name: "Révoquer" }));
    const confirm = screen.getAllByRole("button", { name: "Révoquer" })[1];
    confirm.focus();
    await fireEvent.click(confirm);
    const otherCommand = document.createElement("button");
    document.body.append(otherCommand);
    try {
      otherCommand.focus();
      finish();
      await waitFor(() => expect(confirm).not.toBeInTheDocument());
      expect(otherCommand).toHaveFocus();
    } finally {
      otherCommand.remove();
    }
  });
  it("propose le mode délégué par défaut et explique les deux usages", async () => {
    renderTab();
    await openCreateForm();

    expect(screen.getByRole("radio", { name: /Au nom d’un utilisateur \(recommandé\)/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Traitement machine autonome/ })).not.toBeChecked();
    expect(screen.getByText(/Chaque appel exige le JWT de l’utilisateur/)).toBeInTheDocument();
    expect(screen.getByText(/Le token suffit ; les droits et le périmètre du service s’appliquent/)).toBeInTheDocument();
    expect(screen.getByText(/Ce mode reste identique après régénération/)).toBeInTheDocument();
    const hint = screen.getByTestId("admin-token-required-fields-hint");
    expect(hint).toHaveTextContent("* = champs obligatoires");
    const firstRequiredMarker = hint.closest("form")?.querySelector(".required");
    expect(firstRequiredMarker).toBeInTheDocument();
    expect(firstRequiredMarker && hint.compareDocumentPosition(firstRequiredMarker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it.each([
    { mode: "delegated", label: "Au nom d’un utilisateur" },
    { mode: "machine", label: "Traitement machine autonome" },
  ] satisfies { mode: ServiceTokenMode; label: string }[])(
    "transmet le mode $mode et l’affiche après création",
    async ({ mode, label }) => {
      renderTab();
      await openCreateForm();
      await fillRequiredFields();
      await fireEvent.click(screen.getByRole("radio", { name: new RegExp(label) }));
      await fireEvent.click(screen.getByRole("button", { name: "Créer le token" }));

      await waitFor(() =>
        expect(createMock).toHaveBeenCalledExactlyOnceWith({
          body: {
            name: tokenFixture.name,
            description: tokenFixture.description,
            expiresAt: tokenFixture.expiresAt,
            role: "VISITOR",
            scopeOrganizationId: null,
            serviceMode: mode,
          },
        }),
      );
      expect(await screen.findByText(label, { selector: "p" })).toBeInTheDocument();
      expect(screen.getByText("new-service-token-secret")).toBeInTheDocument();
    },
  );

  it("affiche les modes machine et délégué dans la liste des tokens applicatifs", async () => {
    listMock.mockImplementation(({ query }: { query: { kind: string } }) =>
      Promise.resolve({
        data: {
          results: query.kind === "service" ? [tokenFixture, { ...tokenFixture, id: "machine-token", serviceMode: "machine" }] : [],
          total: query.kind === "service" ? 2 : 0,
        },
      }),
    );
    renderTab();

    const table = await screen.findByTestId("admin-service-tokens-table");
    expect(within(table).getByRole("columnheader", { name: "Mode d’accès" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "Au nom d’un utilisateur" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "Traitement machine autonome" })).toBeInTheDocument();
  });

  it("rétablit le mode délégué lors de la création suivante après un token machine", async () => {
    renderTab();
    await openCreateForm();
    await fillRequiredFields();
    await fireEvent.click(screen.getByRole("radio", { name: /Traitement machine autonome/ }));
    await fireEvent.click(screen.getByRole("button", { name: "Créer le token" }));
    await screen.findByText("new-service-token-secret");
    await openCreateForm();

    expect(screen.getByRole("radio", { name: /Au nom d’un utilisateur \(recommandé\)/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Traitement machine autonome/ })).not.toBeChecked();
  });
});
