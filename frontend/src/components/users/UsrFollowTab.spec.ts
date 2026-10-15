import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { ref } from "vue";
import type { UserFollowedApplicationDto } from "@/client/types.gen";
import UsrFollowTab from "./UsrFollowTab.vue";

const followedApplications = ref<UserFollowedApplicationDto[]>([]);
const unsubscribeFromApp = vi.fn();
const fetchUser = vi.fn();
vi.mock("@/stores/userStore", () => ({
  useUserStore: () => ({
    get user() {
      return { id: "user-1", followedApplications: followedApplications.value };
    },
    unsubscribeFromApp,
    fetchUser,
  }),
}));

beforeEach(() => {
  followedApplications.value = [
    { id: "app-1", label: "Application Alpha" },
    { id: "app-2", label: "Application Beta" },
  ];
  fetchUser.mockReset().mockResolvedValue(undefined);
  unsubscribeFromApp.mockReset().mockImplementation(async (appId: string) => {
    followedApplications.value = followedApplications.value.filter((application) => application.id !== appId);
  });
});
afterEach(() => cleanup());

function renderFollowedApplications() {
  return render(UsrFollowTab, {
    global: { stubs: { RouterLink: { template: '<a href="#"><slot /></a>' } } },
  });
}

describe("Applications suivies — noms et focus", () => {
  it.each(["succès", "refus"] as const)("préserve le lien choisi pendant le désabonnement (%s) et bloque le doublon", async (outcome) => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let finish = () => {};
    unsubscribeFromApp.mockImplementationOnce(
      (appId: string) =>
        new Promise<void>((resolve, reject) => {
          finish = () => {
            if (outcome === "refus") reject(new Error("Refus HTTP"));
            else {
              followedApplications.value = followedApplications.value.filter((app) => app.id !== appId);
              resolve();
            }
          };
        }),
    );
    renderFollowedApplications();
    const first = screen.getByRole("button", { name: "Désabonner de l’application Application Alpha" });
    first.focus();
    await fireEvent.click(first);
    await fireEvent.click(first);
    expect(unsubscribeFromApp).toHaveBeenCalledTimes(1);
    const link = screen.getByRole("link", { name: "Application Beta" });
    link.focus();
    finish();
    await waitFor(() => expect(screen.getByRole("button", { name: "Désabonner de l’application Application Beta" })).not.toBeDisabled());
    expect(link).toHaveFocus();
    expect(followedApplications.value).toHaveLength(outcome === "succès" ? 1 : 2);
    consoleError.mockRestore();
  });
  it("nomme chaque désabonnement et restitue le focus après la suppression de la ligne", async () => {
    renderFollowedApplications();
    await fireEvent.click(screen.getByRole("button", { name: "Désabonner de l’application Application Alpha" }));
    const nextButton = screen.getByRole("button", { name: "Désabonner de l’application Application Beta" });
    await waitFor(() => expect(nextButton).toHaveFocus());
    expect(screen.getByRole("status")).toHaveTextContent("Vous avez été désabonné(e) de l’application Application Alpha.");
    await fireEvent.click(nextButton);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Applications suivies" })).toHaveFocus());
    expect(screen.getByText("Aucune application suivie")).toBeInTheDocument();
  });

  it("annonce un refus sans retirer la ligne et conserve le focus sur son action", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    unsubscribeFromApp.mockRejectedValue(new Error("Refus HTTP"));
    renderFollowedApplications();
    const button = screen.getByRole("button", { name: "Désabonner de l’application Application Alpha" });
    await fireEvent.click(button);
    await waitFor(() => expect(button).toHaveFocus());
    expect(screen.getByRole("alert")).toHaveTextContent("Erreur lors du désabonnement. Veuillez réessayer.");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(followedApplications.value).toHaveLength(2);
    consoleError.mockRestore();
  });
});
