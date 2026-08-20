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

vi.mock("@/api/index", () => ({
  default: {
    correlationSuggestionControllerFindAll: (...args: unknown[]) => findAllMock(...args),
  },
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

function renderTab() {
  return render(AdminCorrelationsTab, {
    global: { plugins: [makeRouter(), createPinia(), [PrimeVue, { theme: { preset: Aura } }]] },
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

    // Le data-testid du DsfrSelect n'atterrit pas sur le <select> (piège #2213) :
    // on passe par le libellé.
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
