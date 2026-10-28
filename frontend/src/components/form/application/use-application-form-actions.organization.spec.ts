import { createPinia, setActivePinia } from "pinia";
import type { OrganizationDto } from "@/client/types.gen";
import { useOrganizationStore } from "@/stores/organizationStore";
import type { ApplicationFormData } from "./application-form.types";
import { useApplicationFormActions } from "./use-application-form-actions";

const mocks = vi.hoisted(() => ({
  syncMaia: vi.fn(),
  findOrganizations: vi.fn(),
  addSuccessMessage: vi.fn(),
  addErrorMessage: vi.fn(),
}));

vi.mock("@/api/index", () => ({
  default: {
    userControllerSyncOrganizationFromMaiaByEmail: mocks.syncMaia,
    organizationsControllerFindAll: mocks.findOrganizations,
  },
}));
vi.mock("@/stores/applicationStore", () => ({ useApplicationStore: () => ({}) }));
vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addSuccessMessage: mocks.addSuccessMessage, addErrorMessage: mocks.addErrorMessage }),
}));

const organization: OrganizationDto = {
  id: "shared-org",
  path: "Direction",
  url: null,
  sigle: null,
  parentId: null,
  businessDivisionId: null,
};

function setup() {
  const data: ApplicationFormData = {
    application: {
      label: "Application",
      description: "Description",
      purposes: [],
      targetPopulations: [],
      status: { status: "to_validate" },
    },
    moa: { actorTypeId: "moa", email: "moa@example.test" },
    moe: { actorTypeId: "moe", email: "moe@example.test" },
  };
  return useApplicationFormActions(
    () => data,
    () => "create",
    () => undefined,
  );
}

describe("synchronisation MOA/MOE avec le store réel des organisations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    setActivePinia(createPinia());
    mocks.syncMaia.mockResolvedValue({
      response: { ok: true },
      data: { organizationId: "shared-org", firstName: "Prénom", lastName: "Nom" },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each([
    { label: "organisation trouvée", results: [organization], error: false },
    { label: "organisation absente", results: [], error: false },
    { label: "organisation refusée par HTTP", results: [], error: true },
  ])("termine les deux spinners pour une même $label", async ({ results, error }) => {
    mocks.findOrganizations.mockResolvedValue({ response: { ok: !error }, data: { results } });
    const actions = setup();
    const moa = actions.syncContact("moa");
    const moe = actions.syncContact("moe");
    expect(actions.moaSyncing.value).toBe(true);
    expect(actions.moeSyncing.value).toBe(true);

    await vi.advanceTimersByTimeAsync(10);

    expect(actions.moaSyncing.value).toBe(false);
    expect(actions.moeSyncing.value).toBe(false);
    await Promise.all([moa, moe]);
    expect(mocks.findOrganizations).toHaveBeenCalledExactlyOnceWith({ query: { ids: ["shared-org"], pageSize: 0 } });
    expect(actions.initialMoaOrganization.value).toEqual(results[0] ?? null);
    expect(actions.initialMoeOrganization.value).toEqual(results[0] ?? null);
    // La fin du chargement n'atteste pas la réussite de la récupération de l'organisation.
    expect(useOrganizationStore().error !== null).toBe(error);
  });
});
