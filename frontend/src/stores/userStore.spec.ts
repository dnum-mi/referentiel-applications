import { createPinia, setActivePinia } from "pinia";
import type { UserWithPermissions } from "@/client/types.gen";
import { useUserStore } from "./userStore";

vi.mock("@/api/index", () => ({ default: {} }));
vi.mock("@/services/authentication", () => ({
  USER_MANAGER: {
    events: { addUserLoaded: vi.fn(), addUserUnloaded: vi.fn() },
    getUser: vi.fn().mockResolvedValue(null),
  },
}));

const userWithScope = (path: string | null): UserWithPermissions =>
  ({
    id: "admin-1",
    role: "ADMIN",
    permissions: [],
    additionalPermissions: [],
    scopeOrganization: path ? { id: "scope-org", path } : null,
  }) as unknown as UserWithPermissions;

// #2508 : même règle que le backend (#2370/#2371) — ancrage à la frontière de segment,
// cible sans organisation hors de tout périmètre.
describe("userStore.isWithinScope", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("autorise tout pour un administrateur sans périmètre", () => {
    const store = useUserStore();
    store.user = userWithScope(null);
    expect(store.isWithinScope("/MI/DGPN")).toBe(true);
    expect(store.isWithinScope(null)).toBe(true);
    expect(store.isWithinScope(undefined)).toBe(true);
  });

  it("accepte le périmètre lui-même et ses descendants", () => {
    const store = useUserStore();
    store.user = userWithScope("/MI/SG");
    expect(store.isWithinScope("/MI/SG")).toBe(true);
    expect(store.isWithinScope("/MI/SG/DNUM")).toBe(true);
    expect(store.isWithinScope("/MI/SG/DNUM/SDAN")).toBe(true);
  });

  it("refuse un simple préfixe de chaîne (/SG ne couvre pas /SGAMI)", () => {
    const store = useUserStore();
    store.user = userWithScope("/MI/SG");
    expect(store.isWithinScope("/MI/SGAMI")).toBe(false);
    expect(store.isWithinScope("/MI/SG-BIS/X")).toBe(false);
  });

  it("refuse une organisation hors périmètre", () => {
    const store = useUserStore();
    store.user = userWithScope("/MI/SG");
    expect(store.isWithinScope("/MI/DGPN")).toBe(false);
    expect(store.isWithinScope("/MI")).toBe(false);
  });

  it("place une cible sans organisation hors du périmètre d'un admin scopé", () => {
    const store = useUserStore();
    store.user = userWithScope("/MI/SG");
    expect(store.isWithinScope(null)).toBe(false);
    expect(store.isWithinScope(undefined)).toBe(false);
    expect(store.isWithinScope("")).toBe(false);
  });
});
