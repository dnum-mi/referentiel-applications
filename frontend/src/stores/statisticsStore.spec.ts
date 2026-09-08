import { createPinia, setActivePinia } from "pinia";
import { useStatisticsStore } from "./statisticsStore";

const { searchMock } = vi.hoisted(() => ({ searchMock: vi.fn() }));

vi.mock("@/api/index", () => ({
  default: { applicationControllerSearch: searchMock },
}));

describe("statisticsStore — total des applications", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    searchMock.mockReset();
    searchMock.mockResolvedValue({ data: { total: 2827 } });
  });

  // Non-régression de « X application(s) trouvée(s) sur Y » : sans `iq__isNull`, le
  // DTO de recherche applique iqGte=0/iqLte=100 et écarte les fiches sans IQ, alors
  // que la recherche du catalogue les compte depuis #2563 — d'où un Y inférieur à X.
  it("demande explicitement les fiches sans IQ pour ne pas sous-compter le total", async () => {
    await useStatisticsStore().countApplications();

    expect(searchMock).toHaveBeenCalledWith({ query: { pageSize: 1, iq__isNull: true } });
  });

  it("expose le total renvoyé par l'API", async () => {
    const store = useStatisticsStore();
    await store.countApplications();

    expect(store.totalApplications).toBe(2827);
  });

  it("ne rappelle pas l'API tant que le total est connu, sauf rechargement forcé", async () => {
    const store = useStatisticsStore();
    await store.countApplications();
    await store.countApplications();
    expect(searchMock).toHaveBeenCalledTimes(1);

    await store.countApplications(true);
    expect(searchMock).toHaveBeenCalledTimes(2);
  });

  it("retombe sur zéro quand l'API ne renvoie pas de total", async () => {
    searchMock.mockResolvedValueOnce({ data: undefined });
    const store = useStatisticsStore();
    await store.countApplications();

    expect(store.totalApplications).toBe(0);
  });
});
