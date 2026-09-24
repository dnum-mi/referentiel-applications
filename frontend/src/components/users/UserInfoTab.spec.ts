import { cleanup, render, screen, waitFor } from "@testing-library/vue";
import { ref } from "vue";
import { Roles, type ContactAdminDto } from "@/client/types.gen";
import UserInfoTab from "./UserInfoTab.vue";

afterEach(() => cleanup());

const contactAdminMock = vi.fn();

vi.mock("@/api/index", () => ({
  default: { userControllerGetMyContactAdmin: (...args: unknown[]) => contactAdminMock(...args) },
}));

const role = ref<Roles>(Roles.READER);
const scopeOrganization = ref<{ path: string } | null>(null);
const fetchUser = vi.fn().mockResolvedValue(undefined);

vi.mock("@/stores/userStore", () => ({
  useUserStore: () => ({
    get user() {
      return { email: "agent@interieur.gouv.fr", organization: { path: "MI/DNUM" }, scopeOrganization: scopeOrganization.value };
    },
    // Getter : un vrai store Pinia déroule ses refs, un objet simple exposerait le ComputedRef.
    get userRole() {
      return role.value;
    },
    authLevel: undefined,
    isAuthDowngraded: false,
    fetchUser,
    updateEmailPreferences: vi.fn(),
  }),
}));

const renderTab = () => render(UserInfoTab, { global: { stubs: { UserPermissions: true, DsfrToggleSwitch: true } } });

const localAdmin: ContactAdminDto = { email: "admin.local@interieur.gouv.fr", source: "local" };

describe("UserInfoTab — administrateur à contacter", () => {
  beforeEach(() => {
    role.value = Roles.READER;
    scopeOrganization.value = null;
    fetchUser.mockClear();
    contactAdminMock.mockReset().mockResolvedValue({ data: localAdmin });
  });

  it("affiche l'administrateur en lien mailto avec l'origine de la résolution", async () => {
    renderTab();

    const link = await screen.findByTestId("user-profile-contact-admin-link");
    expect(link).toHaveAttribute("href", "mailto:admin.local@interieur.gouv.fr");
    expect(link).toHaveTextContent("admin.local@interieur.gouv.fr");
    expect(screen.getByTestId("user-profile-contact-admin-source")).toHaveTextContent("administrateur de votre périmètre");
  });

  it.each([
    ["global", "administrateur global"],
    ["support", "support"],
  ] as const)("libelle l'origine « %s »", async (source, label) => {
    contactAdminMock.mockResolvedValue({ data: { email: "contact@interieur.gouv.fr", source } });

    renderTab();

    expect(await screen.findByTestId("user-profile-contact-admin-source")).toHaveTextContent(label);
  });

  // Un administrateur global n'a personne au-dessus de lui : pas de ligne, pas même d'appel réseau.
  it("masque la ligne et n'appelle pas l'API pour un administrateur global", async () => {
    role.value = Roles.ADMIN;

    renderTab();

    await waitFor(() => expect(fetchUser).toHaveBeenCalled());
    await screen.findByTestId("user-profile-email");
    expect(screen.queryByTestId("user-profile-contact-admin")).not.toBeInTheDocument();
    expect(contactAdminMock).not.toHaveBeenCalled();
  });

  // Un admin scopé a un administrateur à contacter (le backend l'exclut lui-même de la résolution).
  it("affiche la ligne pour un administrateur scopé", async () => {
    role.value = Roles.ADMIN;
    scopeOrganization.value = { path: "MI/DNUM" };

    renderTab();

    const link = await screen.findByTestId("user-profile-contact-admin-link");
    expect(link).toHaveAttribute("href", "mailto:admin.local@interieur.gouv.fr");
    expect(contactAdminMock).toHaveBeenCalled();
  });

  it("n'empêche pas l'affichage du profil si le chargement échoue", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    contactAdminMock.mockRejectedValue(new Error("réseau"));

    renderTab();

    expect(await screen.findByTestId("user-profile-email")).toHaveTextContent("agent@interieur.gouv.fr");
    await waitFor(() => expect(contactAdminMock).toHaveBeenCalled());
    expect(screen.queryByTestId("user-profile-contact-admin")).not.toBeInTheDocument();
    consoleError.mockRestore();
  });
});
