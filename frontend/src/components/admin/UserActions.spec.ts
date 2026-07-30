import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { Permission, Roles, type UserEntity } from "@/client/types.gen";
import UserActions from "./UserActions.vue";

const { hasPermissionsMock, syncOrganizationMock } = vi.hoisted(() => ({
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
    user: { id: "current-user" },
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
} satisfies Required<UserEntity>;

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

  it("opens user edition with the administration permission", async () => {
    hasPermissionsMock.mockReturnValue(true);

    render(UserActions, {
      props: { user: targetUser },
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
});
