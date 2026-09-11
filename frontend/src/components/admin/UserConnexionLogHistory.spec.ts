import { flushPromises } from "@vue/test-utils";
import { cleanup, render } from "@testing-library/vue";
import type { UserConnexionLogDto } from "@/client/types.gen";
import UserConnexionLogHistory from "./UserConnexionLogHistory.vue";

const { findConnexionLogsMock } = vi.hoisted(() => ({ findConnexionLogsMock: vi.fn() }));
vi.mock("@/api/index", () => ({
  default: { userControllerFindConnexionLogs: (...args: unknown[]) => findConnexionLogsMock(...args) },
}));

// RefAppTable (PrimeVue) et AppLoader sont remplacés par des stubs minimalistes qui rendent les
// slots de cellule : on teste la transformation des lignes, la date formatée et le badge de
// niveau, pas le tableau lui-même.
const RefAppTableStub = {
  props: ["items", "columns"],
  template: `<table data-testid="connexion-log-history-table"><tbody>
    <tr v-for="row in items" :key="row.id" :data-testid="'row-' + row.id">
      <td><slot name="body-Date" :data="row">{{ row.Date }}</slot></td>
      <td><slot name="body-Niveau" :data="row">{{ row.Niveau }}</slot></td>
      <td>{{ row.Mode }}</td><td>{{ row.Fournisseur }}</td><td>{{ row.Source }}</td>
    </tr></tbody></table>`,
};

const logs: UserConnexionLogDto[] = [
  {
    id: "l-1",
    authTime: new Date("2026-09-10T00:00:00.000Z"),
    authLevel: "strong",
    authMethod: "CARD",
    authIdp: "principal",
    authSource: "token",
  },
  { id: "l-2", authTime: new Date("2026-09-09T00:00:00.000Z"), authLevel: "unknown", authMethod: null, authIdp: null, authSource: null },
];

function renderHistory() {
  return render(UserConnexionLogHistory, {
    props: { userId: "user-1" },
    global: { stubs: { RefAppTable: RefAppTableStub, AppLoader: { template: "<div />" } } },
  });
}

describe("UserConnexionLogHistory (#1985)", () => {
  beforeEach(() => findConnexionLogsMock.mockReset());
  afterEach(cleanup);

  it("charge et affiche les connexions avec niveau, mode et fournisseur, « Non disponible » à défaut", async () => {
    findConnexionLogsMock.mockResolvedValue({ data: logs, response: { ok: true } });
    const { getByTestId } = renderHistory();
    await flushPromises();

    expect(findConnexionLogsMock).toHaveBeenCalledWith({ path: { id: "user-1" } });
    expect(getByTestId("row-l-1")).toHaveTextContent("10/09/2026");
    expect(getByTestId("row-l-1").querySelector(".fr-badge")).toHaveClass("fr-badge--success");
    expect(getByTestId("row-l-2").querySelector(".fr-badge")).toHaveClass("fr-badge--info");
    expect(getByTestId("row-l-1")).toHaveTextContent("Forte");
    expect(getByTestId("row-l-1")).toHaveTextContent("CARD");
    expect(getByTestId("row-l-1")).toHaveTextContent("principal");
    expect(getByTestId("row-l-1")).toHaveTextContent("Jeton d'accès");
    expect(getByTestId("row-l-2")).toHaveTextContent("Non renseignée");
    expect(getByTestId("row-l-2")).toHaveTextContent("Inconnue");
    expect(getByTestId("row-l-2")).toHaveTextContent("Non disponible");
  });

  it("distingue userinfo du jeton d'accès", async () => {
    findConnexionLogsMock.mockResolvedValue({ data: [{ ...logs[0], authSource: "userinfo" }], response: { ok: true } });
    const { getByTestId } = renderHistory();
    await flushPromises();
    expect(getByTestId("row-l-1")).toHaveTextContent("Userinfo");
  });

  it("indique l'absence de connexion", async () => {
    findConnexionLogsMock.mockResolvedValue({ data: [], response: { ok: true } });
    const { getByTestId } = renderHistory();
    await flushPromises();
    expect(getByTestId("connexion-log-history-empty")).toHaveTextContent("Aucune connexion enregistrée");
  });

  it("signale une erreur de chargement", async () => {
    findConnexionLogsMock.mockResolvedValue({ data: undefined, response: { ok: false } });
    const { getByTestId } = renderHistory();
    await flushPromises();
    expect(getByTestId("connexion-log-history-error")).toHaveTextContent("Erreur lors du chargement");
  });
});
