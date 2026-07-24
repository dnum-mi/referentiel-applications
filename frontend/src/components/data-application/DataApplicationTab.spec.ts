import Aura from "@primevue/themes/aura";
import { cleanup, render, screen, waitFor } from "@testing-library/vue";
import PrimeVue from "primevue/config";
import { createMemoryHistory, createRouter } from "vue-router";
import type { ApplicationWithPerms } from "@/models/Application";
import { routeNames } from "@/router/route-names";
import DataApplicationTab from "./DataApplicationTab.vue";

afterEach(() => cleanup());

// Le sélecteur "lignes par page" du paginateur PrimeVue écoute les changements
// d'orientation via `matchMedia(...).addEventListener` : le stub global de
// vitest-setup.ts ne fournit pas cette méthode.
window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }) as unknown as MediaQueryList;

const findByApplicationMock = vi.fn();

vi.mock("@/api/index", () => ({
  default: {
    dataCatalogControllerFindByApplication: (...args: unknown[]) => findByApplicationMock(...args),
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
    hasPermissions: vi.fn().mockReturnValue(false),
  }),
}));

const StubPage = { template: "<div/>" };

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { name: routeNames.SEARCHAPP, path: "/recherche-application", component: StubPage },
      { name: routeNames.PROFILEAPP, path: "/applications/:id/:tab?", component: StubPage },
      { name: routeNames.DATA_APPLICATION_DETAIL, path: "/applications/:applicationId/data/:dataApplicationId", component: StubPage },
    ],
  });
}

const applicationFixture = {
  id: "app-1",
  label: "Mon application",
  logo: null,
  shortName: null,
  description: "",
  targetPopulations: [],
  purposes: [],
  quality: null,
  myPerms: new Set(),
} as unknown as ApplicationWithPerms;

describe("dataApplicationTab — tags métier cliquables", () => {
  beforeEach(() => {
    findByApplicationMock.mockReset();
  });

  it("renders the tags column as links to the application search page filtered by that tag", async () => {
    findByApplicationMock.mockResolvedValue({
      response: { ok: true },
      data: {
        total: 1,
        results: [
          {
            id: "data-app-1",
            applicationId: "app-1",
            dataDescriptionId: "desc-1",
            dataDescription: {
              id: "desc-1",
              name: "Adresse postale",
              tags: [{ id: "tag-1", name: "rgpd" }],
            },
          },
        ],
      },
    });

    render(DataApplicationTab, {
      props: { application: applicationFixture },
      global: { plugins: [makeRouter(), [PrimeVue, { theme: { preset: Aura } }]] },
    });

    await waitFor(() => screen.getByTestId("data-application-tag-link"));

    expect(screen.getByTestId("data-application-tag-link")).toHaveAttribute("href", "/recherche-application?tag=rgpd");
  });

  it("shows a placeholder when a data row has no business tags", async () => {
    findByApplicationMock.mockResolvedValue({
      response: { ok: true },
      data: {
        total: 1,
        results: [
          {
            id: "data-app-1",
            applicationId: "app-1",
            dataDescriptionId: "desc-1",
            dataDescription: { id: "desc-1", name: "Adresse postale", tags: [] },
          },
        ],
      },
    });

    render(DataApplicationTab, {
      props: { application: applicationFixture },
      global: { plugins: [makeRouter(), [PrimeVue, { theme: { preset: Aura } }]] },
    });

    await waitFor(() => screen.getByTestId("data-application-table"));

    expect(screen.queryByTestId("data-application-tag-link")).not.toBeInTheDocument();
  });
});
