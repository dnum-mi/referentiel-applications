import PrimeVue from "primevue/config";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { createMemoryHistory, createRouter } from "vue-router";
import type { DataApplicationDto } from "@/client/types.gen";
import { routeNames } from "@/router/route-names";
import DataApplicationDetail from "./DataApplicationDetail.vue";

afterEach(() => cleanup());

const findOneMock = vi.fn();
const hasPermissionsMock = vi.fn().mockReturnValue(false);

vi.mock("@/api/index", () => ({
  default: {
    dataCatalogControllerFindOneApplicationData: (...args: unknown[]) => findOneMock(...args),
  },
}));

vi.mock("@/stores/applicationStore", () => ({
  useApplicationStore: () => ({
    getMyPerms: vi.fn().mockResolvedValue(new Set()),
  }),
}));

vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({
    addErrorMessage: vi.fn(),
    addSuccessMessage: vi.fn(),
  }),
}));

vi.mock("@/stores/userStore", () => ({
  useUserStore: () => ({
    hasPermissions: (...args: unknown[]) => hasPermissionsMock(...args),
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

function dataApplicationFixture(overrides: Partial<DataApplicationDto> = {}): DataApplicationDto {
  return {
    id: "data-app-1",
    applicationId: "app-1",
    dataDescriptionId: "desc-1",
    dataDescription: {
      id: "desc-1",
      name: "Adresse postale",
      tags: [
        { id: "tag-1", name: "rgpd", createdAt: "2026-01-01T00:00:00.000Z" },
        { id: "tag-2", name: "sante", createdAt: "2026-01-01T00:00:00.000Z" },
      ],
    },
    ...overrides,
  };
}

describe("dataApplicationDetail — tags métier cliquables", () => {
  beforeEach(() => {
    findOneMock.mockReset();
    hasPermissionsMock.mockReset().mockReturnValue(false);
  });

  it("nomme les aides des données dans les états où leurs champs sont affichés", async () => {
    findOneMock.mockResolvedValue({
      response: { ok: true },
      data: dataApplicationFixture({
        volumetry: 100,
        monthlyVolumetry: 5,
        isReference: true,
        example: "Exemple d'adresse",
        conservation: "Cinq ans",
        businessUsage: "Acheminement du courrier",
        dataDescription: { id: "desc-1", name: "Adresse", description: "Adresse postale", officialUrl: "https://example.fr" },
      }),
    });
    render(DataApplicationDetail, {
      props: { applicationId: "app-1", dataApplicationId: "data-app-1" },
      global: { plugins: [makeRouter()] },
    });
    await waitFor(() => screen.getByTestId("data-application-detail-name"));
    const helps = screen.getAllByRole("button", { name: /^Aide :/ });
    expect(helps).toHaveLength(8);
    for (const help of helps) expect(help).toHaveAccessibleName();
  });

  it("conserve les commandes et le contenu pendant l'actualisation après une édition", async () => {
    hasPermissionsMock.mockReturnValue(true);
    let resolve!: (result: { response: { ok: boolean }; data: DataApplicationDto }) => void;
    findOneMock.mockResolvedValueOnce({ response: { ok: true }, data: dataApplicationFixture() }).mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolve = res;
        }),
    );
    render(DataApplicationDetail, {
      props: { applicationId: "app-1", dataApplicationId: "data-app-1" },
      global: {
        plugins: [makeRouter()],
        stubs: {
          DataApplicationModal: {
            emits: ["dataUpdated"],
            template: '<button data-testid="save-data-fixture" @click="$emit(\'dataUpdated\')">Modifier</button>',
          },
        },
      },
    });
    await waitFor(() => screen.getByTestId("data-application-detail-edit-btn"));
    const title = screen.getByTestId("data-application-detail-name");
    const edit = screen.getByTestId("data-application-detail-edit-btn");
    await fireEvent.click(edit);
    await fireEvent.click(screen.getByTestId("save-data-fixture"));
    expect(screen.getByTestId("data-application-detail-name")).toBe(title);
    expect(edit).toBeInTheDocument();
    expect(screen.getByTestId("data-application-detail")).toHaveAttribute("aria-busy", "true");
    resolve({ response: { ok: true }, data: dataApplicationFixture() });
    await waitFor(() => expect(screen.getByTestId("data-application-detail")).toHaveAttribute("aria-busy", "false"));
    expect(screen.getByTestId("data-application-detail-name")).toBe(title);
  });

  it("renders each business tag as a link to the application search page filtered by that tag", async () => {
    findOneMock.mockResolvedValue({ response: { ok: true }, data: dataApplicationFixture() });

    render(DataApplicationDetail, {
      props: { applicationId: "app-1", dataApplicationId: "data-app-1" },
      global: { plugins: [makeRouter()] },
    });

    await waitFor(() => screen.getByTestId("data-application-detail-name"));

    const tagLinks = screen.getAllByTestId("data-application-detail-tag-link");
    expect(tagLinks).toHaveLength(2);
    expect(tagLinks[0]).toHaveAttribute("href", "/recherche-application?tag=rgpd");
    expect(tagLinks[1]).toHaveAttribute("href", "/recherche-application?tag=sante");
  });

  it("does not render the tags section when the data has no business tags", async () => {
    findOneMock.mockResolvedValue({
      response: { ok: true },
      data: dataApplicationFixture({ dataDescription: { id: "desc-1", name: "Adresse postale", tags: [] } }),
    });

    render(DataApplicationDetail, {
      props: { applicationId: "app-1", dataApplicationId: "data-app-1" },
      global: { plugins: [makeRouter()] },
    });

    await waitFor(() => screen.getByTestId("data-application-detail-name"));

    expect(screen.queryByTestId("data-application-detail-tag-link")).not.toBeInTheDocument();
  });
});

it("annonce la nouvelle fenêtre des quatre liens de données (#3027)", async () => {
  findOneMock.mockResolvedValue({
    response: { ok: true },
    data: dataApplicationFixture({
      dataDescription: { id: "desc-1", name: "Adresse", officialUrl: "https://example.test/officiel" },
      documentationUrl: ["https://example.test/doc"],
      exposures: [{ id: "exposure-1", url: "https://example.test/api", swaggerUrl: "https://example.test/swagger" }],
    }),
  });
  render(DataApplicationDetail, {
    props: { applicationId: "app-1", dataApplicationId: "data-app-1" },
    global: { plugins: [makeRouter(), PrimeVue] },
  });
  const links = await screen.findAllByRole("link", { name: /nouvelle fenêtre/ });
  expect(links).toHaveLength(4);
  for (const link of links) {
    expect(link).toHaveAttribute("title", expect.stringContaining("nouvelle fenêtre"));
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }
});
