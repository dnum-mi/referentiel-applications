import { cleanup, render, screen, waitFor } from "@testing-library/vue";
import { createMemoryHistory, createRouter } from "vue-router";
import type { DataApplicationDto } from "@/client/types.gen";
import { routeNames } from "@/router/route-names";
import DataApplicationDetail from "./DataApplicationDetail.vue";

afterEach(() => cleanup());

const findOneMock = vi.fn();

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
