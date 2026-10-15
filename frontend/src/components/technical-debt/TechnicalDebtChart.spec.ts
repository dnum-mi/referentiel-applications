import { cleanup, fireEvent, render, screen, within } from "@testing-library/vue";
import { flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import type { TechnicalDebtPoint } from "@/composables/use-application-search";
import TechnicalDebtChart from "./TechnicalDebtChart.vue";

const disconnect = vi.fn();
let resize: ResizeObserverCallback;
const point: TechnicalDebtPoint = {
  id: "app-1",
  label: "Nom complet très long de l’application « Portefeuille & services »",
  shortName: "PFS",
  technicalDebtInfo: { technicalMaturity: 4.13, businessMaturity: 1.34, costContainment: 2.73 },
};

async function renderChart(data: TechnicalDebtPoint[] = [point]) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ name: "application", path: "/applications/:id", component: { template: "<p>Fiche</p>" } }],
  });
  const rendered = render(TechnicalDebtChart, { props: { data }, global: { plugins: [router] } });
  await flushPromises();
  return rendered;
}

describe("TIME — transcription et infobulles", () => {
  beforeEach(() => {
    disconnect.mockClear();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: ResizeObserverCallback) {
          resize = callback;
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("associe le diagramme au tableau complet, conserve le nom et le sigle et les valeurs exactes", async () => {
    const { container } = await renderChart();
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("role", "img");
    expect(document.getElementById(svg.getAttribute("aria-describedby")!)).toHaveTextContent("de 1 à 5");
    const details = screen.getByTestId("technical-debt-transcription");
    expect(details).not.toHaveAttribute("open");
    await fireEvent.click(screen.getByRole("link", { name: "Consulter le tableau complet du diagramme TIME" }));
    expect(details).toHaveAttribute("open");
    const table = within(details).getByRole("table");
    expect(svg.getAttribute("aria-details")).toBe(table.id);
    const row = table.querySelector("tbody tr")!;
    expect(row).toHaveTextContent(`${point.label} (PFS)`);
    expect(Array.from(row.querySelectorAll("td")).map((cell) => cell.textContent)).toEqual(["4.13", "1.34", "2.73", "Tolérer"]);
    expect(row.querySelector("th")).toHaveAttribute("scope", "row");
    expect(table.querySelectorAll('thead th[scope="col"]')).toHaveLength(5);
  });

  it("reste affichée pendant le passage de la bulle à l'infobulle, puis se ferme par Échap", async () => {
    const { container } = await renderChart();
    vi.useFakeTimers();
    const anchor = container.querySelector("svg a")!;
    await fireEvent.mouseEnter(anchor);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent(point.label);
    expect(tooltip).toHaveTextContent("4.13");
    await fireEvent.mouseLeave(anchor);
    await fireEvent.mouseEnter(tooltip);
    vi.advanceTimersByTime(1500);
    expect(tooltip).toBeVisible();
    await fireEvent.keyDown(document, { key: "Escape" });
    expect(tooltip).not.toBeVisible();
    expect(anchor).not.toHaveAttribute("aria-describedby");
    await fireEvent.mouseLeave(tooltip);
    await fireEvent.mouseEnter(anchor);
    expect(tooltip).toBeVisible();
  });

  it("ouvre les mêmes valeurs au focus, les garde au départ du pointeur puis les ferme au départ du focus", async () => {
    const { container } = await renderChart();
    vi.useFakeTimers();
    const anchor = container.querySelector("svg a")!;
    expect(anchor).toHaveAttribute("href", "/applications/app-1");
    expect(anchor).toHaveAttribute("tabindex", "0");
    expect(anchor).toHaveAttribute("aria-label", expect.stringContaining(point.label));
    await fireEvent.focus(anchor);
    const tooltip = screen.getByRole("tooltip");
    expect(anchor.getAttribute("aria-describedby")).toBe(tooltip.id);
    await fireEvent.mouseLeave(anchor);
    vi.advanceTimersByTime(1500);
    expect(tooltip).toBeVisible();
    await fireEvent.blur(anchor);
    vi.advanceTimersByTime(250);
    expect(tooltip).not.toBeVisible();
  });

  it("remplace et nettoie l'infobulle lors des données, redimensionnements et démontage", async () => {
    const { container, rerender, unmount } = await renderChart();
    await fireEvent.mouseEnter(container.querySelector("svg a")!);
    await rerender({ data: [{ ...point, label: "Autre application" }] });
    await flushPromises();
    expect(container.querySelectorAll(".td-tooltip")).toHaveLength(1);
    expect(container.querySelector(".td-tooltip")).not.toBeVisible();
    resize([], {} as ResizeObserver);
    await flushPromises();
    expect(container.querySelectorAll(".td-tooltip")).toHaveLength(1);
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(document.querySelector(".td-tooltip")).toBeNull();
  });

  it("traite les libellés comme du texte et conserve les applications sans maturités dans la transcription", async () => {
    const label = '<img src="x" onerror="alert(1)">';
    const { container } = await renderChart([
      { ...point, label },
      { id: "unrated", label: "Sans maturités", shortName: null, technicalDebtInfo: null },
    ]);
    await fireEvent.mouseEnter(container.querySelector("svg a")!);
    expect(screen.getByRole("tooltip")).toHaveTextContent(label);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelectorAll("svg a")).toHaveLength(1);
    const lastRow = container.querySelector("tbody tr:last-child")!;
    expect(lastRow).toHaveTextContent("Sans maturités");
    expect(lastRow.querySelectorAll("td")).toHaveLength(4);
    expect(lastRow).not.toHaveTextContent("À décommissionner");
  });

  it("distingue un coût absent d'un coût égal à 1 dans la bulle et dans le tableau", async () => {
    const { container } = await renderChart([{ ...point, technicalDebtInfo: { technicalMaturity: 4, businessMaturity: 3 } }]);
    const circle = container.querySelector("circle")!;
    expect(circle).toHaveAttribute("stroke-dasharray", "3 2");
    const row = container.querySelector("tbody tr")!;
    expect(row.querySelectorAll("td")[2]).toHaveTextContent("—");
    await fireEvent.focus(container.querySelector("svg a")!);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Maîtrise des coûts MCO : non renseignée");
  });

  it("rattache l'infobulle au bon déclencheur lorsqu'une bulle est focalisée et une autre survolée", async () => {
    const { container } = await renderChart([point, { ...point, id: "app-2", label: "Bulle survolée" }]);
    vi.useFakeTimers();
    const [focused, hovered] = container.querySelectorAll("svg a");
    await fireEvent.focus(focused);
    await fireEvent.mouseEnter(hovered);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Bulle survolée");
    await fireEvent.mouseLeave(hovered);
    vi.advanceTimersByTime(250);
    expect(screen.getByRole("tooltip")).toHaveTextContent(point.label);
    expect(screen.getByRole("tooltip")).not.toHaveTextContent("Bulle survolée");
    await fireEvent.keyDown(document, { key: "Escape" });
    await fireEvent.blur(focused);
    vi.advanceTimersByTime(250);
    expect(container.querySelector(".td-tooltip")).not.toBeVisible();
  });

  it("conserve le focus sur la même application après redimensionnement", async () => {
    const { container } = await renderChart();
    container.querySelector<SVGAElement>("svg a")!.focus();
    resize([], {} as ResizeObserver);
    await flushPromises();
    expect(document.activeElement).toBe(container.querySelector("svg a"));
    expect(screen.getByRole("tooltip")).toHaveTextContent(point.label);
  });

  it("retire l'infobulle lorsqu'une réponse vide retire le diagramme", async () => {
    const { container, rerender } = await renderChart();
    await fireEvent.mouseEnter(container.querySelector("svg a")!);
    expect(screen.getByRole("tooltip")).toBeVisible();
    await rerender({ data: [] });
    await flushPromises();
    expect(container.querySelector(".td-tooltip")).toBeNull();
    expect(screen.getByTestId("technical-debt-empty")).toBeInTheDocument();
  });
});
