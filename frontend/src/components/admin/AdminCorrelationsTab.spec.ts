import Aura from "@primevue/themes/aura";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import { createMemoryHistory, createRouter } from "vue-router";
import type { CorrelationSuggestionDto } from "@/client/types.gen";
import { routeNames } from "@/router/route-names";
import AdminCorrelationsTab from "./AdminCorrelationsTab.vue";

afterEach(() => cleanup());

// Le paginateur PrimeVue écoute les changements d'orientation via
// `matchMedia(...).addEventListener`, absent du stub global de vitest-setup.ts.
window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }) as unknown as MediaQueryList;

const findAllMock = vi.fn();
const acceptMock = vi.fn();
const rejectMock = vi.fn();
const runMock = vi.fn();

vi.mock("@/api/index", () => ({
  default: {
    correlationSuggestionControllerFindAll: (...args: unknown[]) => findAllMock(...args),
    correlationSuggestionControllerAccept: (...args: unknown[]) => acceptMock(...args),
    correlationSuggestionControllerReject: (...args: unknown[]) => rejectMock(...args),
    correlationSuggestionControllerRun: (...args: unknown[]) => runMock(...args),
  },
}));

const { addSuccessMessageMock, addErrorMessageMock } = vi.hoisted(() => ({
  addSuccessMessageMock: vi.fn(),
  addErrorMessageMock: vi.fn(),
}));

vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({
    addSuccessMessage: addSuccessMessageMock,
    addErrorMessage: addErrorMessageMock,
  }),
}));

const StubPage = { template: "<div/>" };

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ name: routeNames.PROFILEAPP, path: "/applications/:id/:tab?", component: StubPage }],
  });
}

const suggestionFixture: CorrelationSuggestionDto = {
  id: "sug-1",
  applicationSourceId: "app-a",
  applicationTargetId: "app-b",
  sourceApplication: { id: "app-a", label: "Gestion des congés" },
  targetApplication: { id: "app-b", label: "Gestion des congés v2" },
  score: 0.75,
  signals: { nameSimilarity: 0.9, sharedDataCount: 2, sharedActorCount: 0 },
  status: "PENDING",
  createdAt: new Date("2026-08-20T00:00:00Z"),
  reviewedById: null,
  reviewedAt: null,
};

// DsfrModal restaure le focus sur l'élément déclencheur au démontage : après un
// test qui l'a ouverte, ce déclencheur n'existe plus et le montage suivant
// échoue ($el de null). Même stub que UserActions.spec.ts — le contenu testé
// (message de confirmation, boutons) vit dans le slot par défaut.
const modalStub = {
  DsfrModal: {
    props: { opened: Boolean },
    template: '<div v-if="opened"><slot /><slot name="footer" /></div>',
  },
};

function renderTab() {
  return render(AdminCorrelationsTab, {
    global: {
      plugins: [makeRouter(), createPinia(), [PrimeVue, { theme: { preset: Aura } }]],
      stubs: modalStub,
    },
  });
}

describe("adminCorrelationsTab (#2286, lecture seule)", () => {
  beforeEach(() => {
    findAllMock.mockReset();
    findAllMock.mockResolvedValue({
      response: { ok: true },
      data: { results: [suggestionFixture], total: 1 },
    });
  });

  it("charge les suggestions en attente par défaut, triées par score décroissant", async () => {
    renderTab();

    await waitFor(() => expect(findAllMock).toHaveBeenCalledTimes(1));
    expect(findAllMock).toHaveBeenCalledWith({
      query: { status: "PENDING", page: 0, pageSize: 15, sortBy: "score", order: "desc" },
    });
  });

  it("affiche la paire en liens vers les fiches, le score et les badges de signaux", async () => {
    renderTab();

    await waitFor(() => screen.getByTestId("correlation-source-link-sug-1"));

    expect(screen.getByTestId("correlation-source-link-sug-1")).toHaveAttribute("href", "/applications/app-a");
    expect(screen.getByTestId("correlation-source-link-sug-1")).toHaveTextContent("Gestion des congés");
    expect(screen.getByTestId("correlation-target-link-sug-1")).toHaveAttribute("href", "/applications/app-b");

    expect(screen.getByText("75 %")).toBeInTheDocument();

    const signals = screen.getByTestId("correlation-signals-sug-1");
    expect(signals).toHaveTextContent("Nom similaire à 90 %");
    expect(signals).toHaveTextContent("2 données partagées");
    // Signal nul (acteurs) : pas de badge
    expect(signals).not.toHaveTextContent("acteur");
  });

  it("refiltre la liste au changement de statut (et repart page 0)", async () => {
    renderTab();
    await waitFor(() => expect(findAllMock).toHaveBeenCalledTimes(1));

    // DsfrSelect (inheritAttrs: false) applique data-testid sur le <select>
    // lui-même : getByTestId et getByLabelText marchent tous les deux. On passe
    // par le libellé, plus proche de l'usage réel.
    const select = screen.getByLabelText("Filtrer par statut");
    await fireEvent.update(select, "REJECTED");

    await waitFor(() => expect(findAllMock).toHaveBeenCalledTimes(2));
    expect(findAllMock).toHaveBeenLastCalledWith({
      query: { status: "REJECTED", page: 0, pageSize: 15, sortBy: "score", order: "desc" },
    });
  });

  it("envoie status=undefined pour « Tous les statuts »", async () => {
    renderTab();
    await waitFor(() => expect(findAllMock).toHaveBeenCalledTimes(1));

    const select = screen.getByLabelText("Filtrer par statut");
    await fireEvent.update(select, "");

    await waitFor(() => expect(findAllMock).toHaveBeenCalledTimes(2));
    expect(findAllMock).toHaveBeenLastCalledWith({
      query: { status: undefined, page: 0, pageSize: 15, sortBy: "score", order: "desc" },
    });
  });
});

describe("adminCorrelationsTab (#2286, actions)", () => {
  beforeEach(() => {
    findAllMock.mockReset();
    acceptMock.mockReset();
    rejectMock.mockReset();
    runMock.mockReset();
    addSuccessMessageMock.mockReset();
    addErrorMessageMock.mockReset();
    findAllMock.mockResolvedValue({
      response: { ok: true },
      data: { results: [suggestionFixture], total: 1 },
    });
  });

  it("accepte après confirmation : appel API, toast de succès et rafraîchissement de la liste", async () => {
    acceptMock.mockResolvedValue({
      response: { ok: true },
      data: { ...suggestionFixture, status: "ACCEPTED" },
    });
    renderTab();
    await waitFor(() => screen.getByTestId("accept-suggestion-sug-1"));

    await fireEvent.click(screen.getByTestId("accept-suggestion-sug-1"));
    // La modale de confirmation détaille l'effet de l'action
    expect(screen.getByTestId("correlation-confirm-modal")).toHaveTextContent("relation « Est corrélée à »");
    await fireEvent.click(screen.getByTestId("correlation-confirm-btn"));

    await waitFor(() => expect(acceptMock).toHaveBeenCalledWith({ path: { id: "sug-1" } }));
    await waitFor(() => expect(findAllMock).toHaveBeenCalledTimes(2));
    expect(addSuccessMessageMock).toHaveBeenCalledWith(expect.stringContaining("acceptée"));
  });

  it("n'appelle pas l'API quand la confirmation est annulée", async () => {
    renderTab();
    await waitFor(() => screen.getByTestId("reject-suggestion-sug-1"));

    await fireEvent.click(screen.getByTestId("reject-suggestion-sug-1"));
    await fireEvent.click(screen.getByTestId("correlation-cancel-btn"));

    expect(rejectMock).not.toHaveBeenCalled();
    expect(findAllMock).toHaveBeenCalledTimes(1);
  });

  it("rejette après confirmation sans créer de relation, et rafraîchit la liste", async () => {
    rejectMock.mockResolvedValue({
      response: { ok: true },
      data: { ...suggestionFixture, status: "REJECTED" },
    });
    renderTab();
    await waitFor(() => screen.getByTestId("reject-suggestion-sug-1"));

    await fireEvent.click(screen.getByTestId("reject-suggestion-sug-1"));
    await fireEvent.click(screen.getByTestId("correlation-confirm-btn"));

    await waitFor(() => expect(rejectMock).toHaveBeenCalledWith({ path: { id: "sug-1" } }));
    expect(acceptMock).not.toHaveBeenCalled();
    await waitFor(() => expect(findAllMock).toHaveBeenCalledTimes(2));
  });

  it("masque les actions pour une suggestion déjà revue", async () => {
    findAllMock.mockResolvedValue({
      response: { ok: true },
      data: { results: [{ ...suggestionFixture, status: "ACCEPTED" }], total: 1 },
    });
    renderTab();
    await waitFor(() => screen.getByTestId("correlation-source-link-sug-1"));

    expect(screen.queryByTestId("accept-suggestion-sug-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("reject-suggestion-sug-1")).not.toBeInTheDocument();
  });

  it("lance la détection puis rafraîchit la liste, avec le résumé en toast", async () => {
    runMock.mockResolvedValue({
      response: { ok: true, status: 200 },
      data: { candidateCount: 5, createdCount: 2, updatedCount: 1 },
    });
    renderTab();
    await waitFor(() => expect(findAllMock).toHaveBeenCalledTimes(1));

    await fireEvent.click(screen.getByTestId("run-detection-button"));

    await waitFor(() => expect(runMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(findAllMock).toHaveBeenCalledTimes(2));
    expect(addSuccessMessageMock).toHaveBeenCalledWith(expect.stringContaining("2 nouvelle(s)"));
  });

  it("signale une détection déjà en cours (409) sans rafraîchir la liste", async () => {
    runMock.mockResolvedValue({ response: { ok: false, status: 409 }, data: undefined });
    renderTab();
    await waitFor(() => expect(findAllMock).toHaveBeenCalledTimes(1));

    await fireEvent.click(screen.getByTestId("run-detection-button"));

    await waitFor(() => expect(runMock).toHaveBeenCalledTimes(1));
    expect(addErrorMessageMock).toHaveBeenCalledWith(expect.stringContaining("déjà en cours"));
    expect(findAllMock).toHaveBeenCalledTimes(1);
  });

  it("explique le conflit quand la suggestion vient d'être revue ailleurs, et rafraîchit", async () => {
    // Un autre administrateur a traité la suggestion entre l'affichage et le clic.
    acceptMock.mockResolvedValue({ response: { ok: false, status: 409 }, data: undefined });
    renderTab();
    await waitFor(() => screen.getByTestId("accept-suggestion-sug-1"));

    await fireEvent.click(screen.getByTestId("accept-suggestion-sug-1"));
    await fireEvent.click(screen.getByTestId("correlation-confirm-btn"));

    await waitFor(() => expect(addErrorMessageMock).toHaveBeenCalledWith(expect.stringContaining("revue par ailleurs")));
    // La liste repart de l'état réel plutôt que d'afficher une ligne fantôme
    await waitFor(() => expect(findAllMock).toHaveBeenCalledTimes(2));
  });
});
