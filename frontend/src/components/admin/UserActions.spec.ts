import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { Permission, Roles, type OrganizationDto, type UserEntity } from "@/client/types.gen";
import UserActions from "./UserActions.vue";

const { currentUserMock, hasPermissionsMock, syncOrganizationMock } = vi.hoisted(() => ({
  currentUserMock: {
    user: {
      id: "current-user",
      scopeOrganization: null as { path: string } | null,
    },
  },
  hasPermissionsMock: vi.fn(),
  syncOrganizationMock: vi.fn(),
}));

vi.mock("@/api/index", () => ({
  default: {
    userControllerSyncOrganizationFromMaiaByEmail: (...args: unknown[]) => syncOrganizationMock(...args),
    userControllerSyncOrganizationFromMaia: vi.fn(),
    userControllerUpdate: vi.fn(),
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
    startImpersonation: vi.fn(),
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
    currentUserMock.user.scopeOrganization = null;
    syncOrganizationMock.mockResolvedValue({
      response: { ok: true },
      data: null,
    });
  });

  afterEach(cleanup);

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
});
