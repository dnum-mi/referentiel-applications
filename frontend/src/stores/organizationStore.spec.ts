import { createPinia, setActivePinia } from "pinia";
import type { OrganizationDto } from "@/client/types.gen";
import { useOrganizationStore } from "./organizationStore";

const { findAllMock } = vi.hoisted(() => ({ findAllMock: vi.fn() }));

vi.mock("@/api/index", () => ({
  default: { organizationsControllerFindAll: findAllMock },
}));

const organization = (id: string) => ({ id }) as unknown as OrganizationDto;

const okResponse = (results: OrganizationDto[]) => ({
  response: { ok: true },
  data: { results },
});

describe("organizationStore — sans limite de pagination", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    findAllMock.mockReset();
  });

  it("recherche toutes les organisations correspondantes (pageSize 0)", async () => {
    findAllMock.mockResolvedValueOnce(okResponse([organization("org-1")]));
    const store = useOrganizationStore();

    await store.find("SEIN");

    expect(findAllMock).toHaveBeenCalledExactlyOnceWith({
      query: { search: "SEIN", usedOnly: undefined, pageSize: 0 },
    });
  });

  it("charge toutes les organisations demandées par id (pageSize 0)", async () => {
    findAllMock.mockResolvedValueOnce(okResponse([organization("org-1")]));
    const store = useOrganizationStore();

    await expect(store.getById("org-1")).resolves.toEqual(organization("org-1"));

    expect(findAllMock).toHaveBeenCalledExactlyOnceWith({
      query: { ids: ["org-1"], pageSize: 0 },
    });
  });
});
