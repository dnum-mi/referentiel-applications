import { cleanup, fireEvent, render, screen, within } from "@testing-library/vue";
import { flushPromises } from "@vue/test-utils";
import { createPinia } from "pinia";
import type { CountByIqDto } from "@/client";
import ApplicationsChart from "./ApplicationsChart.vue";
import ApplicationsIqChart from "./ApplicationsIqChart.vue";
import IqChart from "./IqChart.vue";
import { iqDistribution } from "@/utils/iq-distribution";

const { renderChart, countByMonth, countByIq, fetchIq, destroy, resize } = vi.hoisted(() => ({
  renderChart: vi.fn(),
  countByMonth: vi.fn(),
  countByIq: vi.fn(),
  fetchIq: vi.fn(),
  destroy: vi.fn(),
  resize: vi.fn(),
}));
vi.mock("@/utils/chart", () => ({ renderChart }));
vi.mock("@/api/index", () => ({
  default: {
    applicationControllerCountByMonth: countByMonth,
    applicationControllerCountByIq: countByIq,
    statsControllerGetIqAvgGrouped: fetchIq,
  },
}));

const buttons = { props: ["label", "disabled"], template: '<button :disabled="disabled">{{ label }}<slot /></button>' };
const global = {
  plugins: [createPinia()],
  stubs: {
    DsfrButton: buttons,
    DsfrInput: {
      props: ["modelValue", "label", "type"],
      emits: ["update:modelValue"],
      template:
        '<label>{{ label }}<input :type="type" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></label>',
    },
    DsfrSelect: {
      props: ["modelValue", "label", "options"],
      emits: ["update:modelValue"],
      template:
        '<label>{{ label }}<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="option in options" :value="option.value">{{ option.text }}</option></select></label>',
    },
  },
};

describe("Statistiques — données équivalentes et commandes de lecture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    renderChart.mockReturnValue({ destroy, resize });
    global.plugins = [createPinia()];
    countByMonth.mockResolvedValue({
      response: { ok: true },
      data: [
        { month: "2026-01", total: 12 },
        { month: "2026-02", total: 17 },
      ],
    });
    countByIq.mockResolvedValue({
      response: { ok: true },
      data: [
        { iq: 0, total: 1 },
        { iq: 4.49, total: 2 },
        { iq: 4.5, total: 3 },
        { iq: 5, total: 4 },
        { iq: 99.5, total: 5 },
        { iq: 100, total: 6 },
      ],
    });
    fetchIq.mockResolvedValue({
      response: { ok: true },
      data: [
        { label: "2026-01", moyenne: 72.5 },
        { label: "2026-02", moyenne: 81.3 },
      ],
    });
  });
  afterEach(cleanup);

  it("agrège les IQ arrondis aux frontières des tranches, conserve tous les effectifs et complète les tranches vides", () => {
    const counts: CountByIqDto[] = [
      { iq: 4.49, total: 2 },
      { iq: 4.5, total: 3 },
      { iq: 99.49, total: 5 },
      { iq: 99.5, total: 7 },
      { iq: 100, total: 11 },
    ];
    const rows = iqDistribution(counts);
    expect(rows).toHaveLength(21);
    expect(rows[0]).toEqual({ iq: "0–4 %", total: 2 });
    expect(rows[1]).toEqual({ iq: "5–9 %", total: 3 });
    expect(rows[19]).toEqual({ iq: "95–99 %", total: 5 });
    expect(rows[20]).toEqual({ iq: "100 %", total: 18 });
    expect(rows.reduce((sum, row) => sum + row.total, 0)).toBe(28);
  });

  it("affiche exactement les mêmes 21 tranches et effectifs dans le graphique IQ et le tableau", async () => {
    const { container } = render(ApplicationsIqChart, { global });
    await flushPromises();
    const chartCall = renderChart.mock.calls.at(-1)!;
    const canvas = screen.getByTestId("applications-iq-chart-canvas");
    expect(canvas).toHaveAccessibleName("Répartition des applications par IQ");
    await fireEvent.click(screen.getByRole("button", { name: "Voir le tableau" }));
    const table = screen.getByRole("table", { name: "Répartition des applications par tranche d’IQ arrondi" });
    const labels = Array.from(table.querySelectorAll('tbody th[scope="row"]')).map((cell) => cell.textContent);
    const values = Array.from(table.querySelectorAll("tbody td")).map((cell) => Number(cell.textContent));
    expect(labels).toEqual(chartCall[2]);
    expect(values).toEqual(chartCall[3]);
    expect(values.reduce((a, b) => a + b, 0)).toBe(21);
    expect(container.querySelectorAll('thead th[scope="col"]')).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Voir le graphique" })).toHaveAttribute("aria-pressed", "true");
    await fireEvent.click(screen.getByRole("button", { name: "Voir le graphique" }));
    await flushPromises();
    expect(resize).toHaveBeenCalledOnce();
  });

  it("présente les mois et effectifs dans un tableau nommé et détruit le graphique au démontage", async () => {
    const { unmount } = render(ApplicationsChart, { global });
    await flushPromises();
    await fireEvent.click(screen.getByRole("button", { name: "Voir le tableau" }));
    const table = screen.getByRole("table", { name: "Nombre d’applications référencées par mois" });
    expect(table).toHaveTextContent("janvier 2026");
    expect(table).toHaveTextContent("février 2026");
    expect(Array.from(table.querySelectorAll("tbody td")).map((cell) => Number(cell.textContent))).toEqual([12, 17]);
    unmount();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("décrit une année sélectionnée et permet de trier les valeurs du tableau avec l'état de tri annoncé", async () => {
    render(IqChart, { global });
    await flushPromises();
    await fireEvent.update(screen.getByLabelText("Du"), "2025-01-01");
    await fireEvent.update(screen.getByLabelText("Au"), "2025-12-31");
    await flushPromises();
    expect(screen.getByRole("heading", { name: "Évolution de l’IQ moyen du 01/01/2025 au 31/12/2025" })).toBeInTheDocument();
    expect(fetchIq).toHaveBeenLastCalledWith({ query: { from: "2025-01-01", to: "2025-12-31", groupBy: "month" } });
    await fireEvent.click(screen.getByRole("button", { name: "Voir le tableau" }));
    const table = screen.getByRole("table", { name: "IQ moyen du 01/01/2025 au 31/12/2025" });
    await fireEvent.click(within(table).getByRole("button", { name: "IQ moyen : trier par ordre croissant" }));
    expect(table.querySelectorAll("tbody td")[0]).toHaveTextContent("72.5");
    expect(within(table).getByRole("columnheader", { name: /IQ moyen/ })).toHaveAttribute("aria-sort", "ascending");
    await fireEvent.click(within(table).getByRole("button", { name: "IQ moyen : trier par ordre décroissant" }));
    expect(table.querySelectorAll("tbody td")[0]).toHaveTextContent("81.3");
    expect(within(table).getByRole("columnheader", { name: /IQ moyen/ })).toHaveAttribute("aria-sort", "descending");
  });

  it("termine le chargement IQ en erreur avec une alerte lisible et un tableau masqué", async () => {
    fetchIq.mockRejectedValueOnce(new Error("Échec réseau"));
    render(IqChart, { global });
    await flushPromises();
    expect(screen.getByRole("alert")).toHaveTextContent("Impossible de charger les statistiques IQ");
    expect(screen.queryByTestId("iq-chart-loading")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it.each([
    { component: ApplicationsChart, caption: "Nombre d’applications référencées par mois", canvas: "applications-chart-canvas" },
    {
      component: ApplicationsIqChart,
      caption: "Répartition des applications par tranche d’IQ arrondi",
      canvas: "applications-iq-chart-canvas",
    },
    { component: IqChart, caption: /^IQ moyen du/, canvas: "iq-chart-canvas" },
  ])("garde le tableau $caption accessible lorsque seul le graphique échoue", async ({ component, caption, canvas }) => {
    renderChart.mockImplementationOnce(() => {
      throw new Error("Échec graphique");
    });
    render(component, { global });
    await flushPromises();
    expect(screen.getByRole("alert")).toHaveTextContent("Impossible d’afficher le graphique");
    const table = screen.getByRole("table", { name: caption });
    expect(table).toBeVisible();
    expect(table.querySelectorAll("tbody tr").length).toBeGreaterThan(0);
    expect(screen.getByTestId(canvas)).not.toBeVisible();
    expect(screen.queryByRole("button", { name: /Voir le (tableau|graphique)/ })).not.toBeInTheDocument();
  });

  it("associe le canvas IQ à une figure nommée avec le texte exact de sa légende", async () => {
    render(IqChart, { global });
    await flushPromises();
    const figure = screen.getByRole("figure");
    const caption = figure.querySelector("figcaption")?.textContent?.replace(/\s+/g, " ").trim();
    expect(figure).toHaveAttribute("role", "figure");
    expect(figure).toHaveAttribute("aria-label", caption);
    expect(figure).toHaveAccessibleName(/Évolution de l’IQ moyen du.*IQ moyen en pourcentage/);
    expect(within(figure).getByRole("img")).toBe(screen.getByTestId("iq-chart-canvas"));
  });

  it("ignore la réponse IQ d'une ancienne période reçue après la période courante", async () => {
    type Response = { response: { ok: true }; data: { label: string; moyenne: number }[] };
    let finishOld!: (value: Response) => void;
    let finishCurrent!: (value: Response) => void;
    render(IqChart, { global });
    await flushPromises();
    fetchIq.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        finishOld = resolve;
      }),
    );
    await fireEvent.update(screen.getByLabelText("Du"), "2025-01-01");
    await flushPromises();
    fetchIq.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        finishCurrent = resolve;
      }),
    );
    await fireEvent.update(screen.getByLabelText("Au"), "2025-12-31");
    await flushPromises();
    finishCurrent({ response: { ok: true }, data: [{ label: "2025-12", moyenne: 95 }] });
    await flushPromises();
    finishOld({ response: { ok: true }, data: [{ label: "2025-01", moyenne: 7 }] });
    await flushPromises();
    expect(renderChart.mock.calls.at(-1)![3]).toEqual([95]);
    await fireEvent.click(screen.getByRole("button", { name: "Voir le tableau" }));
    expect(screen.getByRole("table")).toHaveTextContent("2025-12");
    expect(screen.getByRole("table").querySelector("tbody td")).toHaveTextContent("95");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("distingue les semaines d'un même mois sur l'axe et conserve leurs dates précises dans le tableau", async () => {
    render(IqChart, { global });
    await flushPromises();
    fetchIq.mockResolvedValueOnce({
      response: { ok: true },
      data: [
        { label: "2026-01-05", moyenne: 70 },
        { label: "2026-01-12", moyenne: 90 },
      ],
    });
    await fireEvent.update(screen.getByLabelText("Regrouper par"), "week");
    await flushPromises();
    const labels = renderChart.mock.calls.at(-1)![2] as string[];
    expect(labels[0]).toMatch(/^Semaine du 05/);
    expect(labels[1]).toMatch(/^Semaine du 12/);
    await fireEvent.click(screen.getByRole("button", { name: "Voir le tableau" }));
    expect(Array.from(screen.getByRole("table").querySelectorAll("tbody th")).map((cell) => cell.textContent)).toEqual([
      "2026-01-05",
      "2026-01-12",
    ]);
  });
});
