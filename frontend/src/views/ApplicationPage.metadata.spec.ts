import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { Permission } from "@/client";
import ApplicationPage from "./ApplicationPage.vue";

const metadataStore = vi.hoisted(() => ({
  metadataApplicationId: "app-1",
  firstMetadata: {
    createdAt: "2026-05-15T10:00:00.000Z",
    createdBy: { email: "creation@example.com" },
    impersonator: null,
  },
  lastMetadata: {
    createdAt: "2026-11-25T10:00:00.000Z",
    createdBy: { email: "modification@example.com" },
    impersonator: { email: "admin@example.com" },
  },
  getFirstAndLastMetadataByApplication: vi.fn(),
  resetFirstAndLastMetadata: vi.fn(),
}));

vi.mock("@/router", () => ({ setPageTitle: vi.fn(), default: { push: vi.fn() } }));
vi.mock("@/stores/applicationStore", () => ({
  useApplicationStore: () => ({
    applicationsById: { "app-1": { id: "app-1", label: "Application de test", myPerms: new Set([Permission.APP_READ]) } },
    fetchApplication: vi.fn(),
  }),
}));
vi.mock("@/stores/metadataStore", () => ({ useMetadataStore: () => metadataStore }));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => ({ isSubscribed: () => false, hasPermissions: () => true }) }));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage: vi.fn(), addSuccessMessage: vi.fn() }) }));

enableAutoUnmount(afterEach);

it("rend les dates et leurs auteurs dans un bloc de mise en avant sans imbriquer de blocs dans un paragraphe", async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/applications/:id", component: { template: "<div />" } }],
  });
  await router.push("/applications/app-1");
  const wrapper = mount(ApplicationPage, {
    global: {
      plugins: [router],
      stubs: { ApplicationOverview: true, ApplicationProductExport: true, AppLoader: true, DsfrModal: true },
    },
  });
  await flushPromises();

  const highlight = wrapper.get('[data-testid="application-metadata-highlight"]');
  expect(highlight.classes()).toContain("fr-highlight");
  expect(highlight.element.querySelector("p div, p p")).toBeNull();
  expect(highlight.get('[data-testid="application-created-at"]').text()).toBe(
    "Date de création de la fiche : 15/05/2026 (creation@example.com)",
  );
  expect(highlight.get('[data-testid="application-updated-at"]').text()).toBe(
    "Dernière modification de la fiche : 25/11/2026 (modification@example.com (via admin@example.com))",
  );
});
