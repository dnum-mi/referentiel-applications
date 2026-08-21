import { Permission } from "@/client/types.gen";
import type { APP_PERMISSIONS } from "@/models/Application";
import { ref } from "vue";
import { useAppPermission } from "./use-app-permission";

const { hasPermissionsMock } = vi.hoisted(() => ({
  hasPermissionsMock: vi.fn(),
}));

vi.mock("@/stores/userStore", () => ({
  useUserStore: () => ({
    hasPermissions: hasPermissionsMock,
  }),
}));

describe("useAppPermission", () => {
  beforeEach(() => {
    hasPermissionsMock.mockReset();
    hasPermissionsMock.mockReturnValue(true);
  });

  it("convertit le Set de permissions applicatives en tableau pour hasPermissions", () => {
    const myPerms = new Set<APP_PERMISSIONS>([Permission.APP_WRITE as APP_PERMISSIONS]);

    const allowed = useAppPermission(() => myPerms, [Permission.APP_WRITE]);

    expect(allowed.value).toBe(true);
    expect(hasPermissionsMock).toHaveBeenCalledWith([Permission.APP_WRITE], [Permission.APP_WRITE]);
  });

  it("retombe sur un tableau vide quand les permissions applicatives sont absentes", () => {
    const allowed = useAppPermission(() => undefined, [Permission.APP_WRITE]);

    expect(allowed.value).toBe(true);
    expect(hasPermissionsMock).toHaveBeenCalledWith([Permission.APP_WRITE], []);
  });

  it("reste réactif quand la source de permissions change", () => {
    const myPerms = ref<Set<APP_PERMISSIONS>>(new Set());
    hasPermissionsMock.mockImplementation((_, appPerms: string[]) => appPerms.includes(Permission.APP_WRITE));

    const allowed = useAppPermission(myPerms, [Permission.APP_WRITE]);
    expect(allowed.value).toBe(false);

    myPerms.value = new Set([Permission.APP_WRITE as APP_PERMISSIONS]);
    expect(allowed.value).toBe(true);
  });
});
