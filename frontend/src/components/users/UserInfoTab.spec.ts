import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
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
const emailNotificationsEnabled = ref(false);
const updateEmailPreferences = vi.fn();

vi.mock("@/stores/userStore", () => ({
  useUserStore: () => ({
    get user() {
      return {
        id: "user-1",
        email: "agent@interieur.gouv.fr",
        emailNotificationsEnabled: emailNotificationsEnabled.value,
        organization: { path: "MI/DNUM" },
        scopeOrganization: scopeOrganization.value,
      };
    },
    // Getter : un vrai store Pinia déroule ses refs, un objet simple exposerait le ComputedRef.
    get userRole() {
      return role.value;
    },
    authLevel: undefined,
    isAuthDowngraded: false,
    fetchUser,
    updateEmailPreferences,
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
    emailNotificationsEnabled.value = false;
    updateEmailPreferences.mockReset().mockImplementation(async (enabled: boolean) => {
      emailNotificationsEnabled.value = enabled;
    });
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

  it("restitue la préférence enregistrée, son succès et le focus sur le vrai contrôle DSFR", async () => {
    render(UserInfoTab, { global: { stubs: { UserPermissions: true } } });
    const checkbox = screen.getByRole("checkbox", { name: "Recevoir les notifications par email" });
    expect(checkbox).not.toBeChecked();
    await fireEvent.click(checkbox);
    await waitFor(() => expect(updateEmailPreferences).toHaveBeenCalledWith(true));
    await waitFor(() => expect(checkbox).toHaveFocus());
    expect(checkbox).toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent("Vos préférences de notification ont été mises à jour avec succès.");
  });

  it("annonce le refus et restitue la préférence inchangée", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    updateEmailPreferences.mockRejectedValue(new Error("refus"));
    render(UserInfoTab, { global: { stubs: { UserPermissions: true } } });
    const checkbox = screen.getByRole("checkbox", { name: "Recevoir les notifications par email" });
    await fireEvent.click(checkbox);
    await waitFor(() => expect(screen.getByTestId("email-preferences-error")).toHaveAttribute("role", "alert"));
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toHaveFocus();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    consoleError.mockRestore();
  });

  it.each(["succès", "refus"] as const)("préserve le lien rejoint pendant la mise à jour différée (%s)", async (outcome) => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let finish = () => {};
    updateEmailPreferences.mockImplementationOnce(
      (enabled: boolean) =>
        new Promise<void>((resolve, reject) => {
          finish = () => {
            if (outcome === "refus") reject(new Error("refus"));
            else {
              emailNotificationsEnabled.value = enabled;
              resolve();
            }
          };
        }),
    );
    render(UserInfoTab, { global: { stubs: { UserPermissions: true } } });
    const link = await screen.findByTestId("user-profile-contact-admin-link");
    const checkbox = screen.getByRole("checkbox", { name: "Recevoir les notifications par email" });
    checkbox.focus();
    await fireEvent.click(checkbox);
    expect(checkbox).toBeDisabled();
    link.focus();
    finish();
    await waitFor(() => expect(checkbox).not.toBeDisabled());
    expect(link).toHaveFocus();
    expect(checkbox).toHaveProperty("checked", outcome === "succès");
    consoleError.mockRestore();
  });
});
