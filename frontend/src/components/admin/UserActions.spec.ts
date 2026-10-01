import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { flushPromises } from "@vue/test-utils";
import { Permission, Roles, type MaiaOrganizationSuggestionDto, type OrganizationDto, type UserEntity } from "@/client/types.gen";
import UserActions from "./UserActions.vue";

const { currentUserMock, hasPermissionsMock, syncOrganizationMock, fetchUserMock } = vi.hoisted(() => ({
  currentUserMock: {
    user: {
      id: "current-user",
      scopeOrganization: null as { path: string } | null,
    },
  },
  hasPermissionsMock: vi.fn(),
  syncOrganizationMock: vi.fn(),
  fetchUserMock: vi.fn(),
}));

const { blockMock, unblockMock, updateUserMock } = vi.hoisted(() => ({
  blockMock: vi.fn(),
  unblockMock: vi.fn(),
  updateUserMock: vi.fn(),
}));

vi.mock("@/api/index", () => ({
  default: {
    userControllerSyncOrganizationFromMaiaByEmail: (...args: unknown[]) => syncOrganizationMock(...args),
    userControllerSyncOrganizationFromMaia: vi.fn(),
    userControllerUpdate: (...args: unknown[]) => updateUserMock(...args),
    userControllerBlock: (...args: unknown[]) => blockMock(...args),
    userControllerUnblock: (...args: unknown[]) => unblockMock(...args),
  },
}));

vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({
    addErrorMessage: vi.fn(),
    addSuccessMessage: vi.fn(),
  }),
}));

vi.mock("@/stores/userStore", () => ({
  useUserStore: () => ({
    get user() {
      return currentUserMock.user;
    },
    hasPermissions: hasPermissionsMock,
    // Même règle que le vrai store : sans scope tout est permis, sinon préfixe de chemin.
    isWithinScope: (targetOrganizationPath?: string | null) => {
      const scopePath = currentUserMock.user.scopeOrganization?.path;
      if (!scopePath) return true;
      return !targetOrganizationPath || targetOrganizationPath.startsWith(scopePath);
    },
    startImpersonation: vi.fn(),
    fetchUser: fetchUserMock,
  }),
}));

const targetUser = {
  role: Roles.VISITOR,
  organization: null,
  scopeOrganization: null,
  type: "human",
  emailNotificationsEnabled: true,
  followedApplications: [],
  additionalPermissions: [],
  id: "target-user",
  email: "target@example.gouv.fr",
  organizationId: null,
  scopeOrganizationId: null,
  lastPermissionChangeAt: null,
  lastPermissionChangedByEmail: null,
  lastPermissionChangedByImpersonatorEmail: null,
  isBlocked: false,
  blockedAt: null,
} satisfies Required<UserEntity>;

function createOrganization(path: string): OrganizationDto {
  return {
    id: path,
    path,
    url: null,
    sigle: null,
    parentId: null,
    businessDivisionId: null,
    maiaReferences: [],
  };
}

function createTargetUser(organizationPath: string): Required<UserEntity> {
  return {
    ...targetUser,
    organization: createOrganization(organizationPath),
    organizationId: organizationPath,
  };
}

function maiaResponse(organizationPath: string | null) {
  return {
    response: { ok: true },
    data: {
      organizationId: organizationPath,
      organizationPath,
      firstName: "Camille",
      lastName: "Exemple",
      fullName: "Camille Exemple",
    } satisfies MaiaOrganizationSuggestionDto,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

const global = {
  stubs: {
    DsfrButton: {
      props: {
        label: String,
        disabled: Boolean,
      },
      emits: ["click"],
      template: '<button type="button" :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
    },
    DsfrModal: {
      props: {
        opened: Boolean,
      },
      template: '<div v-if="opened"><slot /><slot name="footer" /></div>',
    },
    DsfrCheckboxSet: true,
    DsfrRadioButtonSet: true,
    OrganizationSearchSelect: true,
  },
};

describe("UserActions", () => {
  beforeEach(() => {
    hasPermissionsMock.mockReset();
    syncOrganizationMock.mockReset();
    updateUserMock.mockReset();
    fetchUserMock.mockReset();
    currentUserMock.user.scopeOrganization = null;
    currentUserMock.user.id = "current-user";
    syncOrganizationMock.mockResolvedValue({
      response: { ok: true },
      data: null,
    });
  });

  afterEach(cleanup);

  it("permet d'attribuer explicitement la consultation des technologies à un lecteur", async () => {
    hasPermissionsMock.mockReturnValue(true);
    const reader = { ...targetUser, role: Roles.READER };
    updateUserMock.mockResolvedValue({ data: { ...reader, additionalPermissions: [Permission.TECHNOLOGY_LIST] } });
    render(UserActions, {
      props: { user: reader },
      global: { ...global, stubs: { ...global.stubs, DsfrCheckboxSet: false, DsfrRadioButtonSet: false } },
    });

    await fireEvent.click(screen.getByTestId("admin-user-edit-btn"));
    const capability = screen.getByRole("checkbox", { name: /Consulter les technologies/ });
    expect(capability).not.toBeChecked();
    expect(capability).toBeEnabled();
    await fireEvent.click(capability);
    await fireEvent.click(screen.getByTestId("admin-save-perms-btn"));

    await waitFor(() =>
      expect(updateUserMock).toHaveBeenCalledWith({
        path: { id: reader.id },
        body: { role: Roles.READER, organizationId: null, scopeOrganizationId: null, additionalPermissions: [Permission.TECHNOLOGY_LIST] },
      }),
    );
  });

  it.each([null, "MI/DNUM"])("affiche l'accès hérité d'un administrateur (%s) sans enregistrer de délégation", async (scope) => {
    hasPermissionsMock.mockReturnValue(true);
    const admin = {
      ...targetUser,
      role: Roles.ADMIN,
      scopeOrganizationId: scope,
      scopeOrganization: scope ? createOrganization(scope) : null,
    };
    updateUserMock.mockResolvedValue({ data: admin });
    render(UserActions, {
      props: { user: admin },
      global: { ...global, stubs: { ...global.stubs, DsfrCheckboxSet: false } },
    });
    await fireEvent.click(screen.getByTestId("admin-user-edit-btn"));
    const capability = screen.getByRole("checkbox", { name: /Consulter les technologies/ });
    expect(capability).toBeDisabled();
    expect(capability).toBeChecked();
    expect(screen.getByText("Accès inclus dans le rôle Administrateur, dans son périmètre.")).toBeInTheDocument();

    await fireEvent.click(screen.getByRole("checkbox", { name: "Créer une application" }));
    await fireEvent.click(screen.getByTestId("admin-save-perms-btn"));
    expect(updateUserMock).toHaveBeenCalledWith({
      path: { id: admin.id },
      body: { role: Roles.ADMIN, organizationId: null, scopeOrganizationId: scope, additionalPermissions: [Permission.CREATE_APPLICATION] },
    });
  });

  it.each([Roles.ADMIN, Roles.CONTRIBUTOR])(
    "ne crée pas de délégation lors d'un passage par le rôle Administrateur vers %s",
    async (role) => {
      hasPermissionsMock.mockReturnValue(true);
      const reader = { ...targetUser, role: Roles.READER };
      updateUserMock.mockResolvedValue({ data: { ...reader, role } });
      render(UserActions, {
        props: { user: reader },
        global: { ...global, stubs: { ...global.stubs, DsfrCheckboxSet: false, DsfrRadioButtonSet: false } },
      });
      await fireEvent.click(screen.getByTestId("admin-user-edit-btn"));
      await fireEvent.click(screen.getByRole("radio", { name: /Administrateur/ }));
      expect(screen.getByRole("checkbox", { name: /Consulter les technologies/ })).toBeChecked();

      if (role === Roles.CONTRIBUTOR) {
        await fireEvent.click(screen.getByRole("radio", { name: /Écriture totale/ }));
        expect(screen.getByRole("checkbox", { name: /Consulter les technologies/ })).not.toBeChecked();
        expect(screen.getByRole("checkbox", { name: /Consulter les technologies/ })).toBeEnabled();
      }

      await fireEvent.click(screen.getByTestId("admin-save-perms-btn"));
      expect(updateUserMock).toHaveBeenCalledWith({
        path: { id: reader.id },
        body: { role, organizationId: null, scopeOrganizationId: null, additionalPermissions: [] },
      });
    },
  );

  it("conserve la délégation explicite lors d'une rétrogradation et permet son retrait", async () => {
    hasPermissionsMock.mockReturnValue(true);
    const admin = { ...targetUser, role: Roles.ADMIN, additionalPermissions: [Permission.TECHNOLOGY_LIST] };
    updateUserMock.mockResolvedValue({ data: { ...admin, role: Roles.READER, additionalPermissions: [] } });
    render(UserActions, {
      props: { user: admin },
      global: { ...global, stubs: { ...global.stubs, DsfrCheckboxSet: false, DsfrRadioButtonSet: false } },
    });
    await fireEvent.click(screen.getByTestId("admin-user-edit-btn"));
    await fireEvent.click(screen.getByRole("radio", { name: /Lecture totale/ }));
    const capability = screen.getByRole("checkbox", { name: /Consulter les technologies/ });
    expect(capability).toBeChecked();
    expect(capability).toBeEnabled();
    await fireEvent.click(capability);
    await fireEvent.click(screen.getByTestId("admin-save-perms-btn"));
    expect(updateUserMock).toHaveBeenCalledWith({
      path: { id: admin.id },
      body: { role: Roles.READER, organizationId: null, scopeOrganizationId: null, additionalPermissions: [] },
    });
  });

  it("réserve cette capacité aux profils de lecture, écriture et administration", async () => {
    hasPermissionsMock.mockReturnValue(true);
    render(UserActions, {
      props: { user: targetUser },
      global: { ...global, stubs: { ...global.stubs, DsfrCheckboxSet: false, DsfrRadioButtonSet: false } },
    });
    await fireEvent.click(screen.getByTestId("admin-user-edit-btn"));
    expect(screen.getByRole("checkbox", { name: /Consulter les technologies/ })).toBeDisabled();
    expect(screen.getByText(/Disponible pour les niveaux Lecture totale, Écriture totale et Administrateur/)).toBeInTheDocument();

    await fireEvent.click(screen.getByRole("radio", { name: /Lecture totale/ }));
    expect(screen.getByRole("checkbox", { name: /Consulter les technologies/ })).toBeEnabled();
  });

  it("refait la recherche MAIA à la réouverture après un refus HTTP", async () => {
    hasPermissionsMock.mockReturnValue(true);
    syncOrganizationMock
      .mockResolvedValueOnce({ response: { ok: false, status: 503 }, error: { message: "MAIA indisponible" } })
      .mockResolvedValueOnce(maiaResponse("MININT/ORGANISATION-RETROUVÉE"));
    render(UserActions, { props: { user: targetUser }, global });

    await fireEvent.click(screen.getByTestId("admin-user-edit-btn"));
    await waitFor(() => expect(screen.queryByText(/Récupération de la suggestion MAIA/)).not.toBeInTheDocument());
    const errorText = screen.queryByRole("alert")?.textContent;
    const retryButton = screen.queryByRole("button", { name: "Réessayer la recherche MAIA" });
    await fireEvent.click(screen.getByRole("button", { name: "Annuler la modification" }));
    await fireEvent.click(screen.getByTestId("admin-user-edit-btn"));

    await waitFor(() => expect(syncOrganizationMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("MININT/ORGANISATION-RETROUVÉE")).toBeInTheDocument();
    expect(errorText).toMatch(/MAIA/);
    expect(retryButton).not.toBeNull();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    ["MININT/ORGANISATION-MAIA", "VALIDÉE"],
    ["MININT/AUTRE-ORGANISATION", "NON VALIDÉE"],
  ])("affiche l'organisation proposée par MAIA avec le badge %s → %s", async (currentOrganization, badge) => {
    hasPermissionsMock.mockReturnValue(true);
    syncOrganizationMock.mockResolvedValue(maiaResponse("MININT/ORGANISATION-MAIA"));
    render(UserActions, { props: { user: createTargetUser(currentOrganization) }, global });

    await fireEvent.click(screen.getByTestId("admin-user-edit-btn"));

    expect(await screen.findByText("Organisation MAIA :")).toBeInTheDocument();
    expect(screen.getByText("MININT/ORGANISATION-MAIA")).toBeInTheDocument();
    expect(screen.getByTestId("user-org-not-validated-badge")).toHaveTextContent(new RegExp(`^${badge}$`));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("signale une erreur réseau et permet de relancer la recherche MAIA dans la même fenêtre", async () => {
    hasPermissionsMock.mockReturnValue(true);
    syncOrganizationMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(maiaResponse("MININT/APRÈS-RELANCE"));
    render(UserActions, { props: { user: targetUser }, global });

    await fireEvent.click(screen.getByTestId("admin-user-edit-btn"));
    expect(await screen.findByRole("alert")).toHaveTextContent(/MAIA/);
    expect(screen.queryByTestId("user-org-not-validated-badge")).not.toBeInTheDocument();

    await fireEvent.click(screen.getByRole("button", { name: "Réessayer la recherche MAIA" }));

    expect(await screen.findByText("MININT/APRÈS-RELANCE")).toBeInTheDocument();
    expect(syncOrganizationMock).toHaveBeenCalledTimes(2);
    expect(syncOrganizationMock).toHaveBeenLastCalledWith({ path: { email: targetUser.email } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Réessayer la recherche MAIA" })).not.toBeInTheDocument();
  });

  it("explique l'absence d'organisation lorsque MAIA répond sans chemin", async () => {
    hasPermissionsMock.mockReturnValue(true);
    syncOrganizationMock.mockResolvedValue(maiaResponse(null));
    render(UserActions, { props: { user: targetUser }, global });

    await fireEvent.click(screen.getByTestId("admin-user-edit-btn"));

    expect(await screen.findByText(/aucune organisation.*MAIA|MAIA.*aucune organisation/i)).toBeInTheDocument();
    expect(screen.queryByTestId("user-org-not-validated-badge")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("actualise aussi une suggestion MAIA réussie à chaque réouverture", async () => {
    hasPermissionsMock.mockReturnValue(true);
    syncOrganizationMock
      .mockResolvedValueOnce(maiaResponse("MININT/ANCIENNE-ORGANISATION"))
      .mockResolvedValueOnce(maiaResponse("MININT/NOUVELLE-ORGANISATION"));
    render(UserActions, { props: { user: targetUser }, global });

    await fireEvent.click(screen.getByTestId("admin-user-edit-btn"));
    expect(await screen.findByText("MININT/ANCIENNE-ORGANISATION")).toBeInTheDocument();
    await fireEvent.click(screen.getByRole("button", { name: "Annuler la modification" }));
    await fireEvent.click(screen.getByTestId("admin-user-edit-btn"));

    expect(await screen.findByText("MININT/NOUVELLE-ORGANISATION")).toBeInTheDocument();
    expect(screen.queryByText("MININT/ANCIENNE-ORGANISATION")).not.toBeInTheDocument();
    expect(syncOrganizationMock).toHaveBeenCalledTimes(2);
  });

  it("ignore les réponses des fenêtres précédentes pendant et après la recherche courante", async () => {
    hasPermissionsMock.mockReturnValue(true);
    const first = deferred<ReturnType<typeof maiaResponse>>();
    const second = deferred<ReturnType<typeof maiaResponse>>();
    const current = deferred<ReturnType<typeof maiaResponse>>();
    syncOrganizationMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockReturnValueOnce(current.promise);
    const { rerender } = render(UserActions, { props: { user: targetUser }, global });

    await fireEvent.click(screen.getByTestId("admin-user-edit-btn"));
    await fireEvent.click(screen.getByRole("button", { name: "Annuler la modification" }));
    await fireEvent.click(screen.getByTestId("admin-user-edit-btn"));
    await fireEvent.click(screen.getByRole("button", { name: "Annuler la modification" }));
    const nextUser = { ...targetUser, id: "next-user", email: "next@example.gouv.fr" };
    await rerender({ user: nextUser });
    await fireEvent.click(screen.getByTestId("admin-user-edit-btn"));
    expect(syncOrganizationMock).toHaveBeenLastCalledWith({ path: { email: nextUser.email } });

    first.resolve(maiaResponse("MININT/RÉPONSE-ANCIENNE-1"));
    await flushPromises();

    expect(screen.getByText(/Récupération de la suggestion MAIA/)).toBeInTheDocument();
    expect(screen.queryByText("MININT/RÉPONSE-ANCIENNE-1")).not.toBeInTheDocument();

    current.resolve(maiaResponse("MININT/ORGANISATION-ACTUELLE"));
    expect(await screen.findByText("MININT/ORGANISATION-ACTUELLE")).toBeInTheDocument();
    second.resolve(maiaResponse("MININT/RÉPONSE-ANCIENNE-2"));
    await flushPromises();

    expect(screen.getByText("MININT/ORGANISATION-ACTUELLE")).toBeInTheDocument();
    expect(screen.queryByText("MININT/RÉPONSE-ANCIENNE-2")).not.toBeInTheDocument();
    expect(screen.queryByText(/Récupération de la suggestion MAIA/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("disables user edition without the administration permission", async () => {
    hasPermissionsMock.mockReturnValue(false);

    render(UserActions, {
      props: { user: targetUser },
      global,
    });

    const editButton = screen.getByTestId("admin-user-edit-btn");
    expect(editButton).toBeDisabled();

    await fireEvent.click(editButton);

    expect(screen.queryByTestId("admin-edit-user-modal")).not.toBeInTheDocument();
    expect(syncOrganizationMock).not.toHaveBeenCalled();
    expect(hasPermissionsMock).toHaveBeenCalledWith([Permission.ADMIN_PANEL_MANAGE]);
  });

  it("allows a global administrator to edit any user", async () => {
    hasPermissionsMock.mockReturnValue(true);

    render(UserActions, {
      props: { user: createTargetUser("/HORS-PERIMETRE") },
      global,
    });

    const editButton = screen.getByTestId("admin-user-edit-btn");
    expect(editButton).toBeEnabled();

    await fireEvent.click(editButton);

    await waitFor(() => expect(screen.getByTestId("admin-edit-user-modal")).toBeInTheDocument());
    expect(syncOrganizationMock).toHaveBeenCalledWith({
      path: { email: targetUser.email },
    });
  });

  it("allows a scoped administrator to edit a user within their scope", async () => {
    hasPermissionsMock.mockReturnValue(true);
    currentUserMock.user.scopeOrganization = createOrganization("/MININT/DTNUM");

    render(UserActions, {
      props: { user: createTargetUser("/MININT/DTNUM/SDAN") },
      global,
    });

    const editButton = screen.getByTestId("admin-user-edit-btn");
    expect(editButton).toBeEnabled();

    await fireEvent.click(editButton);

    await waitFor(() => expect(screen.getByTestId("admin-edit-user-modal")).toBeInTheDocument());
  });

  it("blocks a scoped administrator from editing a user outside their scope", async () => {
    hasPermissionsMock.mockReturnValue(true);
    currentUserMock.user.scopeOrganization = createOrganization("/MININT/DTNUM");

    render(UserActions, {
      props: { user: createTargetUser("/MININT/DGPN") },
      global,
    });

    const editButton = screen.getByTestId("admin-user-edit-btn");
    expect(editButton).toBeDisabled();

    await fireEvent.click(editButton);

    expect(screen.queryByTestId("admin-edit-user-modal")).not.toBeInTheDocument();
    expect(syncOrganizationMock).not.toHaveBeenCalled();
  });

  it("blocks the access of a user after confirmation", async () => {
    hasPermissionsMock.mockReturnValue(true);
    blockMock.mockResolvedValue({
      error: undefined,
      data: { ...targetUser, isBlocked: true },
    });

    render(UserActions, {
      props: { user: targetUser },
      global,
    });

    await fireEvent.click(screen.getByTestId("admin-user-block-btn"));
    await waitFor(() => expect(screen.getByTestId("admin-block-user-modal")).toBeInTheDocument());

    await fireEvent.click(screen.getByTestId("admin-block-user-confirm-btn"));

    await waitFor(() => expect(blockMock).toHaveBeenCalledWith({ path: { id: targetUser.id } }));
  });

  it("does not show the block button for the requestor's own account", () => {
    hasPermissionsMock.mockReturnValue(true);
    currentUserMock.user.id = targetUser.id;

    render(UserActions, {
      props: { user: targetUser },
      global,
    });

    expect(screen.queryByTestId("admin-user-block-btn")).not.toBeInTheDocument();
    currentUserMock.user.id = "current-user";
  });

  it("refreshes the current user's session after editing one's own account (#2608)", async () => {
    hasPermissionsMock.mockReturnValue(true);
    currentUserMock.user.id = targetUser.id;
    updateUserMock.mockResolvedValue({
      error: undefined,
      data: { ...targetUser, additionalPermissions: [Permission.QUALITY_CAMPAIGN_MANAGE] },
    });

    render(UserActions, {
      props: { user: targetUser },
      global,
    });

    await fireEvent.click(screen.getByTestId("admin-user-edit-btn"));
    await waitFor(() => expect(screen.getByTestId("admin-edit-user-modal")).toBeInTheDocument());

    await fireEvent.click(screen.getByTestId("admin-save-perms-btn"));

    await waitFor(() => expect(updateUserMock).toHaveBeenCalled());
    expect(fetchUserMock).toHaveBeenCalled();
  });

  it("does not refresh the session when editing a different user", async () => {
    hasPermissionsMock.mockReturnValue(true);
    updateUserMock.mockResolvedValue({
      error: undefined,
      data: targetUser,
    });

    render(UserActions, {
      props: { user: targetUser },
      global,
    });

    await fireEvent.click(screen.getByTestId("admin-user-edit-btn"));
    await waitFor(() => expect(screen.getByTestId("admin-edit-user-modal")).toBeInTheDocument());

    await fireEvent.click(screen.getByTestId("admin-save-perms-btn"));

    await waitFor(() => expect(updateUserMock).toHaveBeenCalled());
    expect(fetchUserMock).not.toHaveBeenCalled();
  });

  it("shows the impersonate button to a global administrator for any user", () => {
    hasPermissionsMock.mockReturnValue(true);

    render(UserActions, {
      props: { user: createTargetUser("/HORS-PERIMETRE") },
      global,
    });

    expect(screen.getByTestId("admin-user-impersonate-btn")).toBeInTheDocument();
  });

  it("shows the impersonate button to a scoped administrator within their scope", () => {
    hasPermissionsMock.mockReturnValue(true);
    currentUserMock.user.scopeOrganization = createOrganization("/MININT/DTNUM");

    render(UserActions, {
      props: { user: createTargetUser("/MININT/DTNUM/SDAN") },
      global,
    });

    expect(screen.getByTestId("admin-user-impersonate-btn")).toBeInTheDocument();
  });

  it("hides the impersonate button from a scoped administrator outside their scope", () => {
    hasPermissionsMock.mockReturnValue(true);
    currentUserMock.user.scopeOrganization = createOrganization("/MININT/DTNUM");

    render(UserActions, {
      props: { user: createTargetUser("/MININT/DGPN") },
      global,
    });

    expect(screen.queryByTestId("admin-user-impersonate-btn")).not.toBeInTheDocument();
  });
});
